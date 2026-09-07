from fastapi import APIRouter, Depends, BackgroundTasks
from app.core.telegram_notify import send_admin_notification
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_customer, get_current_admin
from app.models.customer import Customer
from app.repositories import order as order_repo
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate, OrderItemOut, ReturnItemRequest

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/my", response_model=list[OrderOut])
def list_my_orders(current: Customer = Depends(get_current_customer), db: Session = Depends(get_db)):
    from app.models.order import Order
    return db.query(Order).filter(Order.customer_id == current.id).order_by(Order.created_at.desc()).all()


@router.get("/lookup", response_model=list[OrderOut])
def lookup_orders_by_phone(phone: str, db: Session = Depends(get_db)):
    """
    Публичный поиск последних заказов по номеру телефона — используется клиентским
    ИИ-ботом, чтобы отвечать на вопрос "где мой заказ" без полноценного входа в аккаунт.
    Намеренно не требует авторизации, но ограничен последними 5 заказами.
    """
    from app.models.order import Order
    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if not customer:
        return []
    return (
        db.query(Order)
        .filter(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )


@router.post("/", response_model=OrderOut)
def create_order(data: OrderCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    order = order_repo.create_order(db, data)
    items_text = "\n".join(
        f"— {item.variant.product.title_ru} ({item.variant.color}, {item.variant.size}) x{item.quantity}"
        for item in order.items
    )
    text = (
        f"🛒 <b>Новый заказ №{order.id}</b>\n"
        f"Клиент: {order.customer.name or 'Без имени'} ({order.customer.phone})\n"
        f"Сумма: {order.total} смн\n"
        f"Адрес: {order.delivery_address or '—'}\n"
        f"{items_text}"
    )
    background_tasks.add_task(send_admin_notification, text)
    return order


@router.get("/", response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db)):
    from app.models.order import Order
    return db.query(Order).order_by(Order.created_at.desc()).all()


@router.get("/stats/summary")
def order_stats(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    from datetime import datetime, timedelta
    from app.models.order import Order

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    excluded = ("cancelled", "returned")

    def summarize(since):
        orders = (
            db.query(Order)
            .filter(Order.created_at >= since, Order.status.notin_(excluded))
            .all()
        )
        return {"count": len(orders), "revenue": sum(float(o.total) for o in orders)}

    return {
        "today": summarize(today_start),
        "week": summarize(week_start),
        "month": summarize(month_start),
    }
@router.get("/{order_id}/verify", response_model=OrderOut)
def verify_order_for_customer(order_id: int, phone: str, db: Session = Depends(get_db)):
    """
    Публичный просмотр заказа для самообслуживания клиента через бота — требует
    совпадения номера телефона с владельцем заказа вместо прав администратора.
    """
    from app.models.order import Order
    from fastapi import HTTPException
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.customer.phone != phone:
        raise HTTPException(status_code=404, detail="Заказ не найден или номер телефона не совпадает")
    return order


@router.post("/{order_id}/cancel-request", response_model=OrderOut)
def cancel_order_by_customer(
    order_id: int,
    data: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Отмена всего заказа клиентом через бота — требует номер телефона владельца заказа.
    Разрешена только пока заказ не отправлен (new/awaiting_payment/paid/confirmed).
    """
    from app.models.order import Order
    from fastapi import HTTPException
    phone = data.get("phone", "")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.customer.phone != phone:
        raise HTTPException(status_code=404, detail="Заказ не найден или номер телефона не совпадает")
    if order.status not in ("new", "awaiting_payment", "paid", "confirmed"):
        raise HTTPException(status_code=400, detail="Заказ уже отправлен, отмена через бота недоступна — обратитесь в поддержку")
    updated = order_repo.update_status(db, order, "cancelled")
    text = f"❌ Отменён клиентом через бота: Заказ №{updated.id} — {updated.total} смн"
    background_tasks.add_task(send_admin_notification, text)
    return updated


@router.post("/{order_id}/items/{item_id}/return-request", response_model=OrderItemOut)
def return_item_by_customer(
    order_id: int,
    item_id: int,
    data: ReturnItemRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Возврат одного товара (целиком или частично по количеству) клиентом через бота —
    требует номер телефона владельца заказа.
    """
    from app.models.order import Order
    from fastapi import HTTPException
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order or order.customer.phone != data.phone:
        raise HTTPException(status_code=404, detail="Заказ не найден или номер телефона не совпадает")
    result = order_repo.return_order_item(db, order_id, item_id, quantity=data.quantity)
    text = f"↩️ Возврат товара клиентом через бота: Заказ №{order_id}, позиция №{item_id}, кол-во {data.quantity or 'всё'}"
    background_tasks.add_task(send_admin_notification, text)
    return result


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
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
    updated = order_repo.update_status(db, order, data.status)
    if data.status in ("cancelled", "returned"):
        label = "❌ Отменён" if data.status == "cancelled" else "↩️ Возврат"
        text = f"{label}: Заказ №{updated.id} — {updated.total} смн"
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
        background_tasks.add_task(send_customer_notification, updated.customer.telegram_id, customer_text)

    return updated