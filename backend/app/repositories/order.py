from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.order import Order, OrderItem, OrderStatus, PaymentMethod
from app.models.product import ProductVariant
from app.services.pricing import current_price, price_with_promo
from app.repositories.promo_code import get_valid_promo
from app.repositories.stock_movement import record_movement, get_variant_locked
from app.schemas.order import OrderCreate


def get_or_create_customer(db: Session, name: str, phone: str) -> Customer:
    customer = db.query(Customer).filter(Customer.phone == phone).first()
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
    else:
        customer = get_or_create_customer(db, data.customer_name, data.customer_phone)

    if data.promo_code:
        if not current:
            raise HTTPException(status_code=401, detail="Промокод доступен только авторизованным клиентам")
        customer = current

    variant_ids = [i.product_variant_id for i in data.items]
    if not variant_ids or len(variant_ids) != len(set(variant_ids)):
        raise HTTPException(status_code=400, detail="Некорректный состав заказа")

    total = 0.0
    order_items = []

    for item in data.items:
        if item.quantity < 1:
            raise HTTPException(status_code=400, detail="Некорректное количество")
        variant = get_variant_locked(db, item.product_variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail=f"Variant {item.product_variant_id} not found")
        if variant.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for variant {variant.id}")

        order_items.append((variant, item.quantity))

    subtotal = sum(current_price(v.product) * q for v, q in order_items)
    promo = get_valid_promo(db, data.promo_code, customer.id, subtotal, lock=True) if data.promo_code else None
    promo_percent = promo.percent if promo else None
    order_items = [(v, q, price_with_promo(v.product, promo_percent)) for v, q in order_items]
    total = sum(price * q for _, q, price in order_items)

    order = Order(
        customer_id=customer.id,
        status=OrderStatus.NEW if data.payment_method == "cod" else OrderStatus.AWAITING_PAYMENT,
        source="phone" if admin else "site",
        payment_method=PaymentMethod(data.payment_method),
        delivery_address=data.delivery_address,
        comment=data.comment,
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


def return_order_item(db: Session, order_id: int, item_id: int, quantity: int | None = None) -> OrderItem:
    item = (
        db.query(OrderItem)
        .filter(OrderItem.id == item_id, OrderItem.order_id == order_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

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
        note=f"Возврат — заказ №{order_id}, позиция №{item_id}, кол-во {quantity}",
    )

    order = item.order
    order.total = sum(float(i.price_at_order) * (i.quantity - i.returned_quantity) for i in order.items)

    db.commit()
    db.refresh(item)
    return item


def exchange_item_variant(db: Session, order_id: int, item_id: int, new_variant_id: int) -> OrderItem:
    item = (
        db.query(OrderItem)
        .filter(OrderItem.id == item_id, OrderItem.order_id == order_id)
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

    if new_variant.stock < remaining:
        raise HTTPException(status_code=400, detail=f"Недостаточно остатка нового варианта (доступно: {new_variant.stock})")

    old_variant.stock += remaining
    record_movement(
        db,
        variant_id=old_variant.id,
        movement_type="return",
        quantity=remaining,
        order_id=order_id,
        note=f"Обмен — заказ №{order_id}, позиция №{item_id}: получен обратно старый вариант",
    )

    new_variant.stock -= remaining
    record_movement(
        db,
        variant_id=new_variant.id,
        movement_type="sale",
        quantity=-remaining,
        order_id=order_id,
        note=f"Обмен — заказ №{order_id}, позиция №{item_id}: выдан новый вариант",
    )

    order = item.order
    same_product = new_variant.product_id == old_variant.product_id
    # тот же товар (другой размер/цвет) — клиент уже заплатил, цену не меняем
    new_price = item.price_at_order if same_product else price_with_promo(new_variant.product, order.promo_percent)
    if item.returned_quantity > 0:
        # вернувшиеся штуки остаются в истории на старом варианте, остаток — новой позицией
        item.quantity = item.returned_quantity
        item.is_returned = True
        new_item = OrderItem(product_variant_id=new_variant_id, quantity=remaining,
                             price_at_order=new_price, cost_at_order=new_variant.product.cost_price,
                             returned_quantity=0, is_returned=False)
        order.items.append(new_item)
        item = new_item
    else:
        item.product_variant_id = new_variant_id
        item.price_at_order = new_price
        item.cost_at_order = new_variant.product.cost_price

    order = item.order
    order.total = sum(float(i.price_at_order) * (i.quantity - i.returned_quantity) for i in order.items)

    db.commit()
    db.refresh(item)
    return item


def update_status(db: Session, order: Order, new_status: str) -> Order:
    old_status = order.status
    restore_statuses = {OrderStatus.CANCELLED, OrderStatus.RETURNED}
    already_restored = old_status in restore_statuses
    will_restore = OrderStatus(new_status) in restore_statuses

    order.status = OrderStatus(new_status)

    if new_status == "delivered" and not order.delivered_at:
        from datetime import datetime
        order.delivered_at = datetime.utcnow()

    if already_restored and not will_restore:
        # заказ восстановлен из отмены/возврата — снова списываем товар со склада
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
        for item in order.items:
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
                note=f"Заказ №{order.id} — {new_status}",
            )

    db.commit()
    db.refresh(order)
    return order