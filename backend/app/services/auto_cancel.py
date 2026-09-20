import asyncio
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.core.telegram_notify import send_admin_notification
import app.models.employee  # noqa: F401 — регистрирует таблицу employees для FK orders.courier_id
from app.models.order import Order, OrderStatus
from app.repositories import order as order_repo

UNPAID_HOURS = 24      # карта
UNPAID_HOURS_QR = 2    # QR: клиент не знает, что заказ держит товар — держим недолго
CHECK_EVERY_SECONDS = 5 * 60


def cancel_unpaid_orders() -> list[tuple[int, float, int]]:
    """Отменяет заказы 'Ожидает оплаты' старше UNPAID_HOURS, товар возвращается на склад."""
    db = SessionLocal()
    done: list[tuple[int, float, int]] = []
    try:
        from sqlalchemy import or_, and_
        from app.models.order import PaymentMethod
        now = datetime.utcnow()
        ids = [oid for (oid,) in db.query(Order.id).filter(
            Order.status == OrderStatus.AWAITING_PAYMENT,
            or_(
                and_(Order.payment_method == PaymentMethod.QR, Order.created_at < now - timedelta(hours=UNPAID_HOURS_QR)),
                and_(Order.payment_method != PaymentMethod.QR, Order.created_at < now - timedelta(hours=UNPAID_HOURS)),
            ),
        ).all()]
        for oid in ids:
            try:
                order = db.query(Order).filter(Order.id == oid).first()
                if not order or order.status != OrderStatus.AWAITING_PAYMENT:
                    continue
                updated = order_repo.update_status(db, order, "cancelled", only_from="awaiting_payment")
                if updated.status == OrderStatus.CANCELLED:
                    hours = UNPAID_HOURS_QR if updated.payment_method == PaymentMethod.QR else UNPAID_HOURS
                    done.append((updated.id, float(updated.total), hours))
            except Exception as e:
                db.rollback()
                print(f"[auto-cancel] заказ {oid}: {e}")
    finally:
        db.close()
    return done


async def auto_cancel_loop() -> None:
    while True:
        try:
            for oid, total, hours in await asyncio.to_thread(cancel_unpaid_orders):
                await send_admin_notification(
                    f"⏰ Заказ №{oid} отменён автоматически — не оплачен {hours} ч ({total} смн). Товар возвращён на склад."
                )
        except Exception as e:
            print(f"[auto-cancel] {e}")
        await asyncio.sleep(CHECK_EVERY_SECONDS)
