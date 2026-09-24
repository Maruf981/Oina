import asyncio
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.telegram_notify import send_admin_bot_message
import app.models.employee  # noqa: F401 — регистрирует таблицу employees для FK orders.courier_id
from app.models.order import Order, OrderStatus, PaymentMethod

UNPAID_HOURS = 24        # карта
UNPAID_HOURS_QR = 2      # QR
REMIND_AGAIN_HOURS = 3   # админ не ответил — спросить снова
CHECK_EVERY_SECONDS = 5 * 60
PAY_RU = {"qr": "QR", "card": "карта", "cod": "при получении"}


def unpaid_keyboard(order_id: int) -> dict:
    return {"inline_keyboard": [
        [{"text": "❌ Отменить", "callback_data": f"unpaid:cancel:{order_id}"},
         {"text": "💰 Оплата получена", "callback_data": f"unpaid:paid:{order_id}"}],
        [{"text": "⏳ Ждать ещё 2 ч", "callback_data": f"unpaid:wait:{order_id}"}],
    ]}


def find_due_unpaid() -> list[tuple[int, float, str, int]]:
    """Просроченные неоплаченные заказы, по которым пора спросить админа. Сами заказы НЕ отменяются —
    отмена только по кнопке админа (POST /orders/{id}/unpaid-decision)."""
    db = SessionLocal()
    due: list[tuple[int, float, str, int]] = []
    try:
        from sqlalchemy import or_, and_
        now = datetime.utcnow()
        rows = db.query(Order).filter(
            Order.status == OrderStatus.AWAITING_PAYMENT,
            or_(
                and_(Order.payment_method == PaymentMethod.QR, Order.created_at < now - timedelta(hours=UNPAID_HOURS_QR)),
                and_(Order.payment_method != PaymentMethod.QR, Order.created_at < now - timedelta(hours=UNPAID_HOURS)),
            ),
            or_(Order.payment_reminder_at.is_(None), Order.payment_reminder_at <= now),
        ).with_for_update(skip_locked=True).all()
        for o in rows:
            hours = int((now - o.created_at).total_seconds() // 3600)
            pm = o.payment_method.value if o.payment_method else ""
            due.append((o.id, float(o.total), PAY_RU.get(pm, pm or "—"), hours))
            o.payment_reminder_at = now + timedelta(hours=REMIND_AGAIN_HOURS)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[unpaid] {e}")
    finally:
        db.close()
    return due


async def auto_cancel_loop() -> None:
    while True:
        try:
            for oid, total, pay, hours in await asyncio.to_thread(find_due_unpaid):
                await send_admin_bot_message(
                    settings.ADMIN_TELEGRAM_ID,
                    f"⏰ Заказ №{oid} ({pay}, {total:g} смн) не оплачен уже {hours} ч.\n"
                    f"Сам он не отменится — выберите действие:",
                    reply_markup=unpaid_keyboard(oid),
                )
        except Exception as e:
            print(f"[unpaid] {e}")
        await asyncio.sleep(CHECK_EVERY_SECONDS)
