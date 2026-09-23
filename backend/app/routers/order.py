from app.core.deps import verify_bot_secret
from app.core.phone import phone_core, phone_variants


def _owner_ok(order, phone, telegram_id) -> bool:
    """Заказ показываем/меняем только владельцу: телефон совпадает И пишущий боту Telegram привязан к этому клиенту."""
    c = order.customer if order else None
    return bool(c and phone_core(phone) and phone_core(c.phone) == phone_core(phone) and c.telegram_id and telegram_id and int(c.telegram_id) == int(telegram_id))


from app.schemas.order import OrderAdminOut, OrderAdminPage
from fastapi import APIRouter, Depends, BackgroundTasks, Request
from app.core.telegram_notify import send_admin_notification, send_customer_notification, send_admin_bot_message
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_customer, get_current_admin, get_current_customer_optional
from app.models.customer import Customer
from app.repositories import order as order_repo
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate, OrderItemOut, ReturnItemRequest, ExchangeRequest, ExchangeVariantRequest, OrderPaymentUpdate

router = APIRouter(prefix="/orders", tags=["orders"])

import time as _time
from collections import defaultdict as _defaultdict, deque as _deque
_order_hits: dict = _defaultdict(_deque)


def _order_rate_limit(key: str, limit: int, window: int) -> None:
    from fastapi import HTTPException
    now = _time.monotonic()
    q = _order_hits[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status_code=429, detail="Слишком много заказов подряд. Попробуйте позже или позвоните нам.")
    q.append(now)


@router.get("/my", response_model=list[OrderOut])
def list_my_orders(current: Customer = Depends(get_current_customer), db: Session = Depends(get_db)):
    from app.models.order import Order
    return db.query(Order).filter(Order.customer_id == current.id, Order.via_account == True).order_by(Order.created_at.desc()).all()


@router.get("/lookup", response_model=list[OrderOut])
def lookup_orders_by_phone(phone: str, telegram_id: int = 0, db: Session = Depends(get_db), _: bool = Depends(verify_bot_secret)):
    """
    Публичный поиск последних заказов по номеру телефона — используется клиентским
    ИИ-ботом, чтобы отвечать на вопрос "где мой заказ" без полноценного входа в аккаунт.
    Намеренно не требует авторизации, но ограничен последними 5 заказами.
    """
    from app.models.order import Order
    customer = db.query(Customer).filter(Customer.phone.in_(phone_variants(phone))).first()
    if not customer or not customer.telegram_id or customer.telegram_id != telegram_id:
        return []
    return (
        db.query(Order)
        .filter(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )


@router.post("/", response_model=OrderOut)
def create_order(data: OrderCreate, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db), current: Customer | None = Depends(get_current_customer_optional)):
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip()
    import hmac
    from app.core.config import settings
    from_bot = bool(settings.BOT_INTERNAL_SECRET) and hmac.compare_digest(request.headers.get("x-bot-secret") or "", settings.BOT_INTERNAL_SECRET)
    if not from_bot:
        _order_rate_limit(f"ip:{ip}", 5, 600)
    if not current and not from_bot and data.payment_method != "qr":
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Оплата картой и при получении — только после входа в аккаунт")
    _order_rate_limit(f"phone:{phone_core(data.customer_phone)}", 5, 3600)
    from sqlalchemy import func as _func
    from fastapi import HTTPException
    from app.models.order import Order, OrderStatus
    owner = current or db.query(Customer).filter(Customer.phone.in_(phone_variants(data.customer_phone))).first()
    if owner and data.payment_method != "cod":
        unpaid = db.query(_func.count(Order.id)).filter(Order.customer_id == owner.id, Order.status == OrderStatus.AWAITING_PAYMENT).scalar() or 0
        if unpaid >= 2:
            raise HTTPException(status_code=400, detail="У вас уже 2 неоплаченных заказа. Оплатите их — потом можно оформить новый.")
    order = order_repo.create_order(db, data, current)
    items_text = "\n".join(
        f"— {item.variant.product.title_ru} ({item.variant.color}, {item.variant.size}) x{item.quantity}"
        for item in order.items
    )
    text = (
        f"🛒 <b>Новый заказ №{order.id}</b>\n"
        f"Клиент: {order.customer.name or 'Без имени'} ({order.customer.phone})\n"
        f"Сумма: {order.total} смн\n"
        f"Адрес: {order.delivery_address or '—'}\n"
        f"Оплата: {'💵 При получении' if order.payment_method and order.payment_method.value == 'cod' else (order.payment_method.value.upper() if order.payment_method else '—')}\n"
        f"Регион: {'Душанбе' if order.is_dushanbe else 'За пределы Душанбе (предоплата)'}\n"
        f"{items_text}"
    )
    background_tasks.add_task(send_admin_notification, text)
    return order



@router.post("/phone", response_model=OrderOut)
def create_phone_order(data: OrderCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    return order_repo.create_order(db, data, None, admin=True)

@router.get("/", response_model=list[OrderAdminOut])
def list_orders(limit: int | None = None, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    from app.models.order import Order
    q = db.query(Order).order_by(Order.created_at.desc())
    if limit:
        q = q.limit(min(limit, 500))
    return q.all()


@router.get("/admin-page", response_model=OrderAdminPage)
def list_orders_page(page: int = 1, page_size: int = 20, q: str | None = None, status: str | None = None,
                     period: str | None = None, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    """Заказы для админки по страницам: поиск (№, товар, артикул, телефон, имя), статус, период."""
    return order_repo.admin_orders_page(db, page, page_size, q, status, period)


@router.get("/finance")
def finance(period: str | None = None, supplier_id: int | None = None, batch: str | None = None, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    """Выручка и себестоимость проданного — считается в базе, без загрузки всех заказов."""
    return order_repo.finance_summary(db, period, supplier_id, batch)


@router.get("/finance/sales")
def finance_sales(period: str | None = None, batch: str | None = None, date_from: str | None = None, date_to: str | None = None,
                  supplier_id: int | None = None, mode: str = "lines", search: str | None = None,
                  limit: int = 50, offset: int = 0,
                  db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    return order_repo.finance_sales(db, period, date_from, date_to, supplier_id, mode, search,
                                    max(1, min(limit, 200)), max(0, offset), batch=batch)



@router.get("/stats/summary")
def order_stats(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    from datetime import datetime, timedelta
    from app.models.order import Order

    now = datetime.utcnow()
    today_start = (now + timedelta(hours=5)).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(hours=5)  # полночь по Душанбе
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    excluded = ("cancelled", "returned")

    def summarize(since):
        from sqlalchemy import func
        count, revenue = (
            db.query(func.count(Order.id), func.coalesce(func.sum(Order.total), 0))
            .filter(Order.created_at >= since, Order.status.notin_(excluded))
            .one()
        )
        return {"count": count, "revenue": float(revenue)}

    return {
        "today": summarize(today_start),
        "week": summarize(week_start),
        "month": summarize(month_start),
    }
@router.get("/{order_id}/verify", response_model=OrderOut)
def verify_order_for_customer(order_id: int, phone: str, telegram_id: int = 0, db: Session = Depends(get_db), _: bool = Depends(verify_bot_secret)):
    """
    Публичный просмотр заказа для самообслуживания клиента через бота — требует
    совпадения номера телефона с владельцем заказа вместо прав администратора.
    """
    from app.models.order import Order
    from fastapi import HTTPException
    order = db.query(Order).filter(Order.id == order_id).first()
    if not _owner_ok(order, phone, telegram_id):
        raise HTTPException(status_code=404, detail="Заказ не найден или номер телефона не совпадает")
    return order


@router.post("/{order_id}/cancel-request", response_model=OrderOut)
def cancel_order_by_customer(
    order_id: int,
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_bot_secret),
):
    """
    Отмена всего заказа клиентом через бота — требует номер телефона владельца заказа.
    Разрешена только пока заказ не отправлен (new/awaiting_payment/paid/confirmed).
    """
    from app.models.order import Order
    from fastapi import HTTPException
    phone = data.get("phone", "")
    telegram_id = data.get("telegram_id")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not _owner_ok(order, phone, telegram_id):
        raise HTTPException(status_code=404, detail="Заказ не найден или номер телефона не совпадает")
    if order.status not in ("new", "awaiting_payment", "paid", "confirmed"):
        raise HTTPException(status_code=400, detail="Заказ уже отправлен, отмена через бота недоступна — обратитесь в поддержку")
    if order.delivered_at:
        raise HTTPException(status_code=400, detail="Заказ уже доставлен — отмена недоступна. Для обмена выберите «Обмен».")
    was_paid = order.paid_at is not None
    updated = order_repo.update_status(db, order, "cancelled", require_from={"new", "awaiting_payment", "paid", "confirmed"}, reason="customer_request")
    text = f"❌ Отменён клиентом через бота: Заказ №{updated.id} — {updated.total} смн"
    if was_paid:
        text += f"\n💸 Заказ оплачен — верните клиенту {float(updated.total):g} смн"
    background_tasks.add_task(send_admin_notification, text)
    return updated


@router.post("/{order_id}/items/{item_id}/return-request", response_model=OrderItemOut)
def return_item_by_customer(
    order_id: int,
    item_id: int,
    data: ReturnItemRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_bot_secret),
):
    """
    Возврат одного товара (целиком или частично по количеству) клиентом через бота —
    требует номер телефона владельца заказа.
    """
    from app.models.order import Order
    from fastapi import HTTPException
    order = db.query(Order).filter(Order.id == order_id).first()
    if not _owner_ok(order, data.phone, data.telegram_id):
        raise HTTPException(status_code=404, detail="Заказ не найден или номер телефона не совпадает")
    if order.delivered_at and order.status == "delivered":
        from datetime import datetime, timedelta
        if order.is_dushanbe:
            raise HTTPException(status_code=400, detail="В Душанбе товар проверяется при получении — после принятия возврат не производится. Для обмена размера/цвета (24 часа) воспользуйтесь пунктом «Обмен».")
        if not order.delivered_at or datetime.utcnow() > order.delivered_at + timedelta(hours=24):
            raise HTTPException(status_code=400, detail="Срок возврата истёк (24 часа после получения). Обратитесь в поддержку.")
        if not (data.reason or "").strip():
            raise HTTPException(status_code=400, detail="Укажите причину возврата: брак, повреждение, не тот товар или несоответствие описанию.")
        item = next((i for i in order.items if i.id == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Позиция не найдена")
        text = (
            f"↩️ <b>Заявка на возврат (регион) — Заказ №{order_id}</b>\n"
            f"Клиент: {order.customer.name or 'Без имени'} ({data.phone})\n"
            f"Позиция №{item_id}, кол-во {data.quantity or 'всё'}\n"
            f"Причина: {data.reason}\n"
            f"⚠️ Деньги вернуть только после проверки товара курьером."
        )
        background_tasks.add_task(send_admin_notification, text)
        return item
    if order.status not in ("new", "awaiting_payment", "paid", "confirmed"):
        raise HTTPException(status_code=400, detail="Заказ уже в пути или закрыт — возврат через бота недоступен, обратитесь в поддержку")
    _it = next((i for i in order.items if i.id == item_id), None)
    _prev = _it.returned_quantity if _it else 0
    _paid = order.paid_at is not None
    result = order_repo.return_order_item(db, order_id, item_id, quantity=data.quantity, require_status={"new", "awaiting_payment", "paid", "confirmed"})
    text = f"↩️ Возврат товара клиентом через бота: Заказ №{order_id}, позиция №{item_id}, кол-во {data.quantity or 'всё'}"
    if _paid:
        text += f"\n💸 Заказ оплачен — верните клиенту {float(result.price_at_order) * (result.returned_quantity - _prev):g} смн"
    background_tasks.add_task(send_admin_notification, text)
    return result


@router.post("/{order_id}/exchange-request")
def request_exchange(
    order_id: int,
    data: ExchangeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_bot_secret),
):
    """
    Запрос на обмен размера/цвета клиентом через бота — доступен только в течение
    24 часов (Душанбе) / 48 часов (другие регионы) после того, как заказ получил
    статус "Доставлен". Не меняет заказ автоматически — только уведомляет админа,
    решение и оформление обмена — вручную.
    """
    from app.models.order import Order
    from fastapi import HTTPException
    from datetime import datetime, timedelta

    order = db.query(Order).filter(Order.id == order_id).first()
    if not _owner_ok(order, data.phone, data.telegram_id):
        raise HTTPException(status_code=404, detail="Заказ не найден или номер телефона не совпадает")
    if order.status != "delivered" or not order.delivered_at:
        raise HTTPException(status_code=400, detail="Обмен доступен только для доставленных заказов")

    window_hours = 24 if order.is_dushanbe else 48
    deadline = order.delivered_at + timedelta(hours=window_hours)
    if datetime.utcnow() > deadline:
        raise HTTPException(
            status_code=400,
            detail=f"Срок обмена истёк ({window_hours} ч. после доставки). Обратитесь в поддержку.",
        )

    text = (
        f"🔄 <b>Запрос на обмен — Заказ №{order.id}</b>\n"
        f"Клиент: {order.customer.name or 'Без имени'} ({data.phone})\n"
        f"Товар: {data.current_item}\n"
        f"Желаемый размер: {data.desired_size}\n"
        f"Желаемый цвет: {data.desired_color}\n"
        f"{f'Наличие: {data.availability_note}' if data.availability_note else ''}\n"
        f"{f'Комментарий: {data.comment}' if data.comment else ''}"
    )
    background_tasks.add_task(send_admin_notification, text)
    return {"ok": True}


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    from app.models.order import Order
    from fastapi import HTTPException
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/{order_id}/items/{item_id}/return", response_model=OrderItemOut)
def return_order_item(
    order_id: int,
    item_id: int,
    quantity: int | None = None,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    return order_repo.return_order_item(db, order_id, item_id, quantity=quantity)


@router.patch("/{order_id}/items/{item_id}/exchange-variant", response_model=OrderItemOut)
def exchange_item_variant(
    order_id: int,
    item_id: int,
    data: ExchangeVariantRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    """
    Полный обмен варианта товара в заказе (админом вручную) — на любой другой товар/
    размер/цвет/цену. Автоматически: возвращает старый вариант на склад, списывает
    новый со склада, пересчитывает цену позиции и общую сумму заказа.
    """
    return order_repo.exchange_item_variant(db, order_id, item_id, data.new_variant_id)


@router.patch("/{order_id}/assign-courier")
def assign_courier(
    order_id: int,
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    """
    Назначает доставщика (сотрудника) на заказ и отправляет ему в Telegram детали
    заказа с кнопками "Доставлено" / "Не удалось".
    """
    from app.models.order import Order
    from app.models.employee import Employee
    from fastapi import HTTPException

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    courier_id = data.get("courier_id")
    employee = db.query(Employee).filter(Employee.id == courier_id).first()
    if not employee or employee.is_archived:
        raise HTTPException(status_code=404, detail="Доставщик не найден")
    if not employee.telegram_id:
        raise HTTPException(
            status_code=400,
            detail=f"{employee.name} ещё не подключил Telegram — попросите его написать боту @Oina_admin_bot и поделиться номером телефона",
        )

    order.courier_id = courier_id
    db.commit()
    db.refresh(order)

    items_text = "\n".join(
        f"— {item.variant.product.title_ru} ({item.variant.color}, {item.variant.size}) x{item.quantity}"
        for item in order.items
    )
    text = (
        f"🚚 <b>Вам назначена доставка — Заказ №{order.id}</b>\n"
        f"Клиент: {order.customer.name or 'Без имени'} ({order.customer.phone})\n"
        f"Адрес: {order.delivery_address or '—'}\n"
        f"Сумма: {order.total} смн\n"
        f"{('💬 ' + order.comment + chr(10)) if order.comment else ''}"
        f"{items_text}"
    )
    reply_markup = {
        "inline_keyboard": [[
            {"text": "✅ Доставлено", "callback_data": f"courier_delivered:{order.id}"},
            {"text": "❌ Не удалось", "callback_data": f"courier_failed:{order.id}"},
        ]]
    }
    background_tasks.add_task(send_admin_bot_message, employee.telegram_id, text, reply_markup)

    return {"ok": True, "courier_id": courier_id, "courier_name": employee.name}


@router.post("/{order_id}/courier-status")
def courier_status(
    order_id: int,
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_bot_secret),
):
    """
    Обновление статуса доставки самим доставщиком через бота — требует совпадения
    telegram_id с тем, кто реально назначен на этот заказ.
    """
    from app.models.order import Order
    from app.models.employee import Employee
    from fastapi import HTTPException

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or not order.courier_id:
        raise HTTPException(status_code=404, detail="Заказ не найден или доставщик не назначен")

    employee = db.query(Employee).filter(Employee.id == order.courier_id).first()
    telegram_id = data.get("telegram_id")
    if not employee or employee.telegram_id != telegram_id:
        raise HTTPException(status_code=403, detail="Вы не назначены на этот заказ")

    status = data.get("status")
    if status == "delivered":
        if order.status == "delivered":
            return {"ok": True}
        if order.status in ("cancelled", "returned"):
            raise HTTPException(status_code=400, detail="Заказ отменён или возвращён — отметить доставку нельзя")
        order_repo.update_status(db, order, "delivered")
        return {"ok": True}
    elif status == "failed":
        reason = data.get("reason")
        text = f"❌ Доставщик {employee.name} не смог доставить заказ №{order.id}"
        if reason in order_repo.CANCEL_REASONS:
            text += f"\nПричина: {order_repo.CANCEL_REASONS[reason]}"
            if reason in order_repo.FAKE_REASONS:
                text += " (засчитается как фейк при отмене)"
        text += "\nОтмените заказ в админке с этой причиной или назначьте повторную доставку."
        background_tasks.add_task(send_admin_notification, text)
        return {"ok": True}
    else:
        raise HTTPException(status_code=400, detail="Некорректный статус")


@router.patch("/{order_id}/payment", response_model=OrderOut)
def mark_payment(
    order_id: int,
    data: OrderPaymentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    """Отметка "Оплата получена" / снятие отметки. Для QR/карты из "Ожидает оплаты" заказ переходит в "Подтверждён"."""
    from app.models.order import Order
    from fastapi import HTTPException
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    was_paid = order.paid_at is not None
    updated = order_repo.set_paid(db, order, data.paid)
    if data.paid and not was_paid and updated.customer.telegram_id:
        background_tasks.add_task(send_customer_notification, updated.customer.telegram_id,
                                  f"💰 Оплата по заказу №{updated.id} получена. Спасибо!")
    return updated


@router.patch("/{order_id}/status", response_model=OrderOut)
def change_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    from app.models.order import Order
    from fastapi import HTTPException
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if data.status == "paid":
        # совместимость: кнопка "Оплачен" в боте = отметка оплаты, а не статус
        return mark_payment(order_id, OrderPaymentUpdate(paid=True), background_tasks, db, True)
    prev_status = order.status.value
    was_paid = order.paid_at is not None
    updated = order_repo.update_status(db, order, data.status, reason=data.reason)
    if data.status in ("cancelled", "returned"):
        label = "❌ Отменён" if data.status == "cancelled" else "↩️ Возврат"
        text = f"{label}: Заказ №{updated.id} — {updated.total} смн"
        if updated.cancel_reason:
            text += f"\nПричина: {order_repo.CANCEL_REASONS.get(updated.cancel_reason, updated.cancel_reason)}"
            if updated.cancel_reason in order_repo.FAKE_REASONS:
                text += " ⚠️ фейк"
        if was_paid and prev_status != data.status:
            text += f"\n💸 Деньги получены — верните клиенту {float(updated.total):g} смн"
        background_tasks.add_task(send_admin_notification, text)

    status_labels_ru = {
        "new": "Новый",
        "awaiting_payment": "Ожидает оплаты",
        "paid": "Оплачен",
        "confirmed": "Подтверждён",
        "shipped": "Отправлен",
        "delivered": "Доставлен",
        "cancelled": "Отменён",
        "returned": "Возврат",
    }
    if updated.customer.telegram_id:
        label = status_labels_ru.get(data.status, data.status)
        customer_text = f"📦 Статус вашего заказа №{updated.id} изменён: {label}"
        if data.status == "shipped" and updated.courier_id:
            from app.models.employee import Employee
            courier = db.query(Employee).filter(Employee.id == updated.courier_id).first()
            if courier:
                customer_text += f"\n\n🚚 Доставщик: {courier.name}"
                if courier.phone:
                    customer_text += f"\n📞 {courier.phone}"
        background_tasks.add_task(send_customer_notification, updated.customer.telegram_id, customer_text)

    return updated


@router.get("/finance/batches")
def finance_batches(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    return order_repo.finance_batches(db)


@router.get("/finance/batch-stock")
def finance_batch_stock(batch: str | None = None, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    return order_repo.batch_stock(db, batch)
