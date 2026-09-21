from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.order import Order, OrderItem, OrderStatus, PaymentMethod
from app.models.product import ProductVariant
from app.services.pricing import current_price, price_with_promo
from app.repositories.promo_code import get_valid_promo
from app.repositories.stock_movement import record_movement, get_variant_locked
from app.schemas.order import OrderCreate


# Причины отмены/отказа. Фейк (вина клиента) — только FAKE_REASONS.
CANCEL_REASONS = {
    "refused": "Отказался без причины",
    "no_answer": "Не берёт трубку / не открыл",
    "wrong_address": "Дал неверный адрес",
    "not_fit": "Не подошёл размер / брак",
    "store_fault": "Ошибка магазина / курьера",
    "customer_request": "Клиент попросил отменить",
    "other": "Другое",
}
FAKE_REASONS = {"refused", "no_answer", "wrong_address"}


def get_or_create_customer(db: Session, name: str, phone: str) -> Customer:
    from app.core.phone import phone_variants
    customer = db.query(Customer).filter(Customer.phone.in_(phone_variants(phone))).first()
    if customer:
        return customer
    customer = Customer(name=name, phone=phone)
    db.add(customer)
    db.flush()
    return customer


def create_order(db: Session, data: OrderCreate, current: Customer | None = None, admin: bool = False) -> Order:
    if data.payment_method not in ("qr", "card", "cod"):
        raise HTTPException(status_code=400, detail="Неизвестный способ оплаты")
    if data.payment_method == "cod":
        if not data.is_dushanbe:
            raise HTTPException(status_code=400, detail="Оплата при получении доступна только по Душанбе")
        if not current and not admin:
            raise HTTPException(status_code=401, detail="Оплата при получении доступна только авторизованным клиентам")
        customer = current or get_or_create_customer(db, data.customer_name, data.customer_phone)
        fakes = db.query(Order.id).filter(
            Order.customer_id == customer.id,
            Order.status.in_([OrderStatus.CANCELLED, OrderStatus.RETURNED]),
            Order.cancel_reason.in_(FAKE_REASONS),
        ).count()
        if fakes >= 2:
            raise HTTPException(status_code=400, detail="Оплата при получении недоступна: клиент 2 раза не принял заказ. Нужна предоплата — QR или карта.")
    else:
        customer = current or get_or_create_customer(db, data.customer_name, data.customer_phone)

    if data.promo_code:
        if not current and not admin:
            raise HTTPException(status_code=401, detail="Промокод доступен только авторизованным клиентам")
        customer = current or customer

    variant_ids = [i.product_variant_id for i in data.items]
    if not variant_ids or len(variant_ids) != len(set(variant_ids)):
        raise HTTPException(status_code=400, detail="Некорректный состав заказа")

    total = 0.0
    order_items = []

    for item in sorted(data.items, key=lambda i: i.product_variant_id):
        if item.quantity < 1:
            raise HTTPException(status_code=400, detail="Некорректное количество")
        variant = get_variant_locked(db, item.product_variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail=f"Variant {item.product_variant_id} not found")
        if not admin and not getattr(variant.product, "is_active", True):
            raise HTTPException(status_code=400, detail=f"Товар снят с продажи: {variant.product.title_ru}")
        if variant.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"В наличии только {variant.stock} шт: {variant.product.title_ru} ({variant.color}, {variant.size})")

        order_items.append((variant, item.quantity))

    subtotal = sum(current_price(v.product) * q for v, q in order_items)
    promo = get_valid_promo(db, data.promo_code, customer.id, subtotal, lock=True) if data.promo_code else None
    promo_percent = promo.percent if promo else None
    order_items = [(v, q, price_with_promo(v.product, promo_percent)) for v, q in order_items]
    total = sum(price * q for _, q, price in order_items)

    order_comment = data.comment
    if current and not admin:
        from app.core.phone import phone_core
        if phone_core(data.customer_phone) != phone_core(current.phone):
            recipient = f"Получатель: {data.customer_name}, {data.customer_phone}"
            order_comment = f"{recipient} · {order_comment}" if order_comment else recipient
    if order_comment:
        order_comment = order_comment[:500]

    order = Order(
        customer_id=customer.id,
        status=OrderStatus.NEW if data.payment_method == "cod" else OrderStatus.AWAITING_PAYMENT,
        source="phone" if admin else "site",
        via_account=bool(current) and not admin,  # гостевые и телефонные заказы в аккаунте не показываются
        payment_method=PaymentMethod(data.payment_method),
        delivery_address=data.delivery_address,
        comment=order_comment,
        is_dushanbe=data.is_dushanbe,
        total=total,
        promo_code_id=promo.id if promo else None,
        promo_code=promo.code if promo else None,
        promo_percent=promo_percent,
    )
    db.add(order)
    db.flush()

    for variant, quantity, price in order_items:
        db.add(OrderItem(
            order_id=order.id,
            product_variant_id=variant.id,
            quantity=quantity,
            price_at_order=price,
            cost_at_order=variant.product.cost_price,
            supplier_id=variant.product.supplier_id,
        ))
        variant.stock -= quantity
        record_movement(
            db,
            variant_id=variant.id,
            movement_type="sale",
            quantity=-quantity,
            order_id=order.id,
            cost_price_at_time=variant.product.cost_price,
        )

    db.commit()
    db.refresh(order)
    return order


def return_order_item(db: Session, order_id: int, item_id: int, quantity: int | None = None, require_status: set[str] | None = None) -> OrderItem:
    # блокируем заказ: одновременные возврат/обмен/отмена идут строго по очереди
    db.query(Order).filter(Order.id == order_id).with_for_update().populate_existing().first()
    item = (
        db.query(OrderItem)
        .filter(OrderItem.id == item_id, OrderItem.order_id == order_id)
        .populate_existing()
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    if require_status and item.order.status.value not in require_status:
        raise HTTPException(status_code=400, detail="Статус заказа уже изменился — возврат через бота недоступен, обратитесь в поддержку")
    remaining = item.quantity - item.returned_quantity
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Item already fully returned")
    if item.order.status in (OrderStatus.CANCELLED, OrderStatus.RETURNED):
        raise HTTPException(status_code=400, detail="Заказ отменён или возвращён — товар уже вернулся на склад")

    if quantity is None:
        quantity = remaining
    if quantity < 1 or quantity > remaining:
        raise HTTPException(status_code=400, detail=f"Некорректное количество для возврата (доступно: {remaining})")

    variant = get_variant_locked(db, item.product_variant_id)

    item.returned_quantity += quantity
    item.is_returned = item.returned_quantity >= item.quantity
    variant.stock += quantity
    record_movement(
        db,
        variant_id=item.product_variant_id,
        movement_type="return",
        quantity=quantity,
        order_id=order_id,
        cost_price_at_time=item.cost_at_order,
        note=f"Возврат — заказ №{order_id}, позиция №{item_id}, кол-во {quantity}",
    )

    order = item.order
    order.total = sum(float(i.price_at_order) * (i.quantity - i.returned_quantity) for i in order.items)
    if all(i.returned_quantity >= i.quantity for i in order.items) and order.status not in (OrderStatus.CANCELLED, OrderStatus.RETURNED):
        # все позиции возвращены: до отправки это отмена, после — "Возврат" (склад уже пополнен выше)
        not_sent = order.status in (OrderStatus.NEW, OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID, OrderStatus.CONFIRMED) and not order.delivered_at
        order.status = OrderStatus.CANCELLED if not_sent else OrderStatus.RETURNED

    db.commit()
    db.refresh(item)
    return item


def exchange_item_variant(db: Session, order_id: int, item_id: int, new_variant_id: int) -> OrderItem:
    # блокируем заказ: одновременные возврат/обмен/отмена идут строго по очереди
    db.query(Order).filter(Order.id == order_id).with_for_update().populate_existing().first()
    item = (
        db.query(OrderItem)
        .filter(OrderItem.id == item_id, OrderItem.order_id == order_id)
        .populate_existing()
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    remaining = item.quantity - item.returned_quantity
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Эта позиция уже полностью возвращена — обменивать нечего")
    if item.order.status in (OrderStatus.CANCELLED, OrderStatus.RETURNED):
        raise HTTPException(status_code=400, detail="Заказ отменён или возвращён — обмен невозможен")
    if new_variant_id == item.product_variant_id:
        raise HTTPException(status_code=400, detail="Выбран тот же вариант товара")

    lock_ids = sorted(set([item.product_variant_id, new_variant_id]))
    locked = {vid: get_variant_locked(db, vid) for vid in lock_ids}

    old_variant = locked[item.product_variant_id]
    new_variant = locked[new_variant_id]
    if not new_variant:
        raise HTTPException(status_code=404, detail="Новый вариант товара не найден")
    if new_variant.product_id != old_variant.product_id and (not new_variant.product.is_active or new_variant.product.is_archived):
        raise HTTPException(status_code=400, detail=f"Товар «{new_variant.product.title_ru}» снят с продажи — выберите другой")

    if new_variant.stock < remaining:
        raise HTTPException(status_code=400, detail=f"Недостаточно остатка нового варианта (доступно: {new_variant.stock})")

    old_variant.stock += remaining
    record_movement(
        db,
        variant_id=old_variant.id,
        movement_type="return",
        quantity=remaining,
        order_id=order_id,
        cost_price_at_time=item.cost_at_order,
        note=f"Обмен — заказ №{order_id}, позиция №{item_id}: получен обратно старый вариант",
    )

    new_variant.stock -= remaining
    record_movement(
        db,
        variant_id=new_variant.id,
        movement_type="sale",
        quantity=-remaining,
        order_id=order_id,
        cost_price_at_time=new_variant.product.cost_price,
        note=f"Обмен — заказ №{order_id}, позиция №{item_id}: выдан новый вариант",
    )

    order = item.order
    old_total = float(order.total)
    same_product = new_variant.product_id == old_variant.product_id
    # тот же товар (другой размер/цвет) — клиент уже заплатил, цену не меняем
    new_price = item.price_at_order if same_product else price_with_promo(new_variant.product, order.promo_percent)
    if item.returned_quantity > 0:
        # вернувшиеся штуки остаются в истории на старом варианте, остаток — новой позицией
        item.quantity = item.returned_quantity
        item.is_returned = True
        new_item = OrderItem(product_variant_id=new_variant_id, quantity=remaining,
                             price_at_order=new_price, cost_at_order=new_variant.product.cost_price,
                             returned_quantity=0, is_returned=False, supplier_id=new_variant.product.supplier_id)
        order.items.append(new_item)
        item = new_item
    else:
        item.product_variant_id = new_variant_id
        item.price_at_order = new_price
        item.cost_at_order = new_variant.product.cost_price
        item.supplier_id = new_variant.product.supplier_id

    order = item.order
    order.total = sum(float(i.price_at_order) * (i.quantity - i.returned_quantity) for i in order.items)
    diff = round(float(order.total) - old_total, 2)
    if diff and order.paid_at:
        note = f"Обмен: {'доплата клиента' if diff > 0 else 'вернуть клиенту'} {abs(diff):g} смн"
        order.comment = (f"{order.comment} · {note}" if order.comment else note)[:500]

    db.commit()
    db.refresh(item)
    return item


STATUS_RU = {
    "new": "Новый", "awaiting_payment": "Ожидает оплаты", "paid": "Оплачен", "confirmed": "Подтверждён",
    "shipped": "Отправлен", "delivered": "Доставлен", "cancelled": "Отменён", "returned": "Возврат",
}
# "Оплачен" больше не статус — оплата отмечается отдельно (set_paid -> paid_at)
ALLOWED_TRANSITIONS = {
    "new": {"confirmed", "shipped", "delivered", "cancelled"},
    "awaiting_payment": {"confirmed", "cancelled"},
    "paid": {"confirmed", "shipped", "delivered", "cancelled", "returned"},  # старые заказы
    "confirmed": {"shipped", "delivered", "cancelled"},
    "shipped": {"delivered", "cancelled", "returned"},
    "delivered": {"returned", "shipped"},  # shipped — откат ошибочной отметки
    "cancelled": {"new", "confirmed"},  # восстановление
    "returned": {"delivered"},  # откат ошибочного возврата
}


def set_paid(db: Session, order: Order, paid: bool) -> Order:
    """Отметка оплаты отдельно от статуса доставки."""
    from datetime import datetime
    order = db.query(Order).filter(Order.id == order.id).with_for_update().populate_existing().one()
    prepaid = order.payment_method != PaymentMethod.COD
    if paid:
        if order.paid_at:
            return order
        order.paid_at = datetime.utcnow()
        if order.status == OrderStatus.AWAITING_PAYMENT:
            order.status = OrderStatus.CONFIRMED
    else:
        if not order.paid_at:
            return order
        if prepaid and order.status in (OrderStatus.SHIPPED, OrderStatus.DELIVERED):
            raise HTTPException(status_code=400, detail="Заказ с предоплатой уже отправлен — снять оплату нельзя")
        order.paid_at = None
        if prepaid and order.status == OrderStatus.CONFIRMED:
            order.status = OrderStatus.AWAITING_PAYMENT
    db.commit()
    db.refresh(order)
    return order


def update_status(db: Session, order: Order, new_status: str, only_from: str | None = None, require_from: set[str] | None = None, reason: str | None = None) -> Order:
    try:
        OrderStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный статус")
    # блокируем заказ: двойной клик или админ+бот одновременно не вернут товар дважды
    order = db.query(Order).filter(Order.id == order.id).with_for_update().populate_existing().one()
    if only_from and order.status.value != only_from:
        return order
    old_status = order.status
    if require_from and old_status.value not in require_from:
        raise HTTPException(status_code=400, detail="Статус заказа уже изменился — обновите и попробуйте снова")
    if old_status == OrderStatus(new_status):
        return order
    if new_status not in ALLOWED_TRANSITIONS.get(old_status.value, set()):
        raise HTTPException(status_code=400, detail=f"Нельзя сменить статус: «{STATUS_RU.get(old_status.value, old_status.value)}» → «{STATUS_RU.get(new_status, new_status)}»")
    prepaid = order.payment_method != PaymentMethod.COD
    if prepaid and new_status == "new":
        raise HTTPException(status_code=400, detail="Заказ с предоплатой восстанавливается в «Подтверждён» (после отметки оплаты)")
    if prepaid and new_status in ("confirmed", "shipped", "delivered") and not order.paid_at:
        raise HTTPException(status_code=400, detail="Заказ не оплачен — сначала отметьте «💰 Оплата получена»")
    if reason and reason not in CANCEL_REASONS:
        raise HTTPException(status_code=400, detail="Неизвестная причина отмены")
    if (not prepaid and old_status == OrderStatus.SHIPPED and new_status in ("cancelled", "returned") and not reason):
        raise HTTPException(status_code=400, detail="Укажите причину отказа при доставке")
    if old_status == OrderStatus.RETURNED and all(i.returned_quantity >= i.quantity for i in order.items):
        raise HTTPException(status_code=400, detail="Все позиции возвращены по отдельности — откат статуса ничего не вернёт. Оформите новый заказ.")
    restore_statuses = {OrderStatus.CANCELLED, OrderStatus.RETURNED}
    already_restored = old_status in restore_statuses
    will_restore = OrderStatus(new_status) in restore_statuses

    from datetime import datetime
    if new_status == "delivered" and not order.delivered_at:
        order.delivered_at = datetime.utcnow()
    elif new_status not in ("delivered", "returned"):
        # откат ошибочного "Доставлен" — срок возврата/обмена начнётся заново при реальной доставке
        order.delivered_at = None

    if already_restored and not will_restore:
        # заказ восстановлен из отмены/возврата — снова списываем товар со склада
        if order.promo_code_id:
            from app.models.promo_code import PromoCode
            from app.repositories.promo_code import count_uses
            promo = db.query(PromoCode).filter(PromoCode.id == order.promo_code_id).with_for_update().first()
            if promo and (
                (promo.max_uses is not None and count_uses(db, promo.id) >= promo.max_uses)
                or count_uses(db, promo.id, order.customer_id) >= promo.per_customer_limit
            ):
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Нельзя восстановить: лимит промокода {promo.code} уже исчерпан")
        need: dict[int, int] = {}
        for i in order.items:
            left = i.quantity - i.returned_quantity
            if left > 0:
                need[i.product_variant_id] = need.get(i.product_variant_id, 0) + left
        locked = {vid: get_variant_locked(db, vid) for vid in sorted(need)}
        for vid, qty in need.items():
            if locked[vid].stock < qty:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Нельзя восстановить заказ: на складе {locked[vid].stock}, нужно {qty} (вариант №{vid})")
        for vid, qty in need.items():
            locked[vid].stock -= qty
            record_movement(db, variant_id=vid, movement_type="sale", quantity=-qty, order_id=order.id,
                            cost_price_at_time=locked[vid].product.cost_price,
                            note=f"Заказ №{order.id} восстановлен из статуса {old_status.value}")

    if will_restore and not already_restored:
        for item in sorted(order.items, key=lambda i: i.product_variant_id):
            remaining = item.quantity - item.returned_quantity
            if remaining <= 0:
                continue
            variant = get_variant_locked(db, item.product_variant_id)
            variant.stock += remaining
            record_movement(
                db,
                variant_id=item.product_variant_id,
                movement_type="return",
                quantity=remaining,
                order_id=order.id,
                cost_price_at_time=item.cost_at_order,
                note=f"Заказ №{order.id} — {new_status}",
            )

    if not prepaid:
        if new_status == "delivered" and not order.paid_at:
            order.paid_at = datetime.utcnow()  # курьер получил наличные
        elif old_status == OrderStatus.DELIVERED and new_status == "shipped":
            order.paid_at = None  # откат ошибочной доставки
    if will_restore:
        order.cancel_reason = reason
    elif already_restored:
        order.cancel_reason = None  # восстановлен — причина отмены больше не действует

    order.status = OrderStatus(new_status)
    db.commit()
    db.refresh(order)
    return order

# ---------- Админка: заказы по страницам и финансы на сервере ----------

def period_range(period: str | None):
    """Границы периода в UTC; день считается по Душанбе (UTC+5)."""
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    midnight = (now + timedelta(hours=5)).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(hours=5)
    if period == "today":
        return midnight, None
    if period == "yesterday":
        return midnight - timedelta(days=1), midnight
    if period == "week":
        return now - timedelta(days=7), None
    if period == "month":
        return now - timedelta(days=30), None
    return None, None


def admin_orders_page(db: Session, page: int = 1, page_size: int = 20, q: str | None = None,
                      status: str | None = None, period: str | None = None):
    from sqlalchemy import or_, select
    from app.models.product import Product
    query = db.query(Order)
    if status:
        try:
            query = query.filter(Order.status == OrderStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="Некорректный статус")
    since, until = period_range(period)
    if since:
        query = query.filter(Order.created_at >= since)
    if until:
        query = query.filter(Order.created_at < until)
    q = (q or "").strip()
    if q:
        like = f"%{q}%"
        by_product = (select(OrderItem.order_id)
                      .join(ProductVariant, ProductVariant.id == OrderItem.product_variant_id)
                      .join(Product, Product.id == ProductVariant.product_id)
                      .where(or_(Product.title_ru.ilike(like), Product.title_tj.ilike(like), Product.catalog_number.ilike(like))))
        by_customer = select(Customer.id).where(or_(Customer.phone.ilike(like), Customer.name.ilike(like)))
        conds = [Order.id.in_(by_product), Order.customer_id.in_(by_customer)]
        if q.isdigit():
            conds.append(Order.id == int(q))
        query = query.filter(or_(*conds))
    total = query.count()
    page_size = max(1, min(page_size, 100))
    page = max(1, page)
    items = (query.order_by(Order.created_at.desc(), Order.id.desc())
             .offset((page - 1) * page_size).limit(page_size).all())
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def finance_summary(db: Session, period: str | None = None, supplier_id: int | None = None):
    from sqlalchemy import func, case
    from app.models.product import Product
    excluded = [OrderStatus.CANCELLED, OrderStatus.RETURNED]
    since, until = period_range(period)
    qty = OrderItem.quantity - OrderItem.returned_quantity
    sup = func.coalesce(OrderItem.supplier_id, Product.supplier_id)
    q = (db.query(
            sup.label("sid"),
            func.coalesce(func.sum(OrderItem.price_at_order * qty), 0),
            func.coalesce(func.sum(func.coalesce(OrderItem.cost_at_order, 0) * qty), 0),
            func.coalesce(func.sum(case((OrderItem.cost_at_order.is_(None), qty), else_=0)), 0),
         )
         .join(Order, Order.id == OrderItem.order_id)
         .join(ProductVariant, ProductVariant.id == OrderItem.product_variant_id)
         .join(Product, Product.id == ProductVariant.product_id)
         .filter(Order.status.notin_(excluded), qty > 0))
    oq = db.query(func.count(Order.id)).filter(Order.status.notin_(excluded))
    if since:
        q = q.filter(Order.created_at >= since)
        oq = oq.filter(Order.created_at >= since)
    if until:
        q = q.filter(Order.created_at < until)
        oq = oq.filter(Order.created_at < until)
    if supplier_id is not None:
        q = q.filter(sup == supplier_id)
    rows = q.group_by(sup).all()
    by_supplier = [{"supplier_id": sid, "revenue": float(rev), "cost": float(cost)} for sid, rev, cost, _ in rows]
    return {
        "orders_count": oq.scalar() or 0,
        "revenue": sum(r["revenue"] for r in by_supplier),
        "cost": sum(r["cost"] for r in by_supplier),
        "missing_cost": int(sum(int(m) for *_, m in rows)),
        "by_supplier": by_supplier,
    }
