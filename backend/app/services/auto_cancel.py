import asyncio
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.core.telegram_notify import send_admin_notification
import app.models.employee  # noqa: F401 — регистрирует таблицу employees для FK orders.courier_id
from app.models.order import Order, OrderStatus
from app.repositories import order as order_repo

UNPAID_HOURS = 24
CHECK_EVERY_SECONDS = 15 * 60


def cancel_unpaid_orders() -> list[tuple[int, float]]:
    """Отменяет заказы 'Ожидает оплаты' старше UNPAID_HOURS, товар возвращается на склад."""
    db = SessionLocal()
    done: list[tuple[int, float]] = []
    try:
        deadline = datetime.utcnow() - timedelta(hours=UNPAID_HOURS)
        ids = [oid for (oid,) in db.query(Order.id).filter(
            Order.status == OrderStatus.AWAITING_PAYMENT,
            Order.created_at < deadline,
        ).all()]
        for oid in ids:
            try:
                order = db.query(Order).filter(Order.id == oid).first()
                if not order or order.status != OrderStatus.AWAITING_PAYMENT:
                    continue
                updated = order_repo.update_status(db, order, "cancelled", only_from="awaiting_payment")
                if updated.status == OrderStatus.CANCELLED:
                    done.append((updated.id, float(updated.total)))
            except Exception as e:
                db.rollback()
                print(f"[auto-cancel] заказ {oid}: {e}")
    finally:
        db.close()
    return done


async def auto_cancel_loop() -> None:
    while True:
        try:
            for oid, total in await asyncio.to_thread(cancel_unpaid_orders):
                await send_admin_notification(
                    f"⏰ Заказ №{oid} отменён автоматически — не оплачен {UNPAID_HOURS} ч ({total} смн). Товар возвращён на склад."
                )
        except Exception as e:
            print(f"[auto-cancel] {e}")
        await asyncio.sleep(CHECK_EVERY_SECONDS)
