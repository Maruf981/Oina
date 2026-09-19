import re
import time
from collections import defaultdict, deque

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.models.promo_code import PromoCode
from app.services.pricing import today_dushanbe

CODE_RE = re.compile(r"^[A-Z0-9]{3,32}$")
_hits: dict[int, deque] = defaultdict(deque)


def _rate_limit(customer_id: int, limit: int = 10, window: int = 60) -> None:
    now = time.monotonic()
    q = _hits[customer_id]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status_code=429, detail="Слишком много попыток, подождите минуту")
    q.append(now)


def normalize_code(code: str | None) -> str:
    return (code or "").strip().upper()


def count_uses(db: Session, promo_id: int, customer_id: int | None = None) -> int:
    q = db.query(func.count(Order.id)).filter(
        Order.promo_code_id == promo_id,
        Order.status != OrderStatus.CANCELLED,
    )
    if customer_id is not None:
        q = q.filter(Order.customer_id == customer_id)
    return q.scalar() or 0


def get_valid_promo(db: Session, code: str, customer_id: int, subtotal: float, lock: bool = False) -> PromoCode:
    _rate_limit(customer_id)
    code = normalize_code(code)
    if not CODE_RE.match(code):
        raise HTTPException(status_code=400, detail="Промокод не найден")

    q = db.query(PromoCode).filter(PromoCode.code == code)
    if lock:
        q = q.with_for_update()
    promo = q.first()
    if not promo or not promo.is_active:
        raise HTTPException(status_code=400, detail="Промокод не найден")

    today = today_dushanbe()
    if promo.starts_on and promo.starts_on > today:
        raise HTTPException(status_code=400, detail="Промокод ещё не действует")
    if promo.ends_on and promo.ends_on < today:
        raise HTTPException(status_code=400, detail="Срок действия промокода истёк")
    if promo.min_order_total and subtotal < float(promo.min_order_total):
        raise HTTPException(status_code=400, detail=f"Промокод действует при заказе от {int(promo.min_order_total)} смн")
    if promo.max_uses is not None and count_uses(db, promo.id) >= promo.max_uses:
        raise HTTPException(status_code=400, detail="Лимит использований промокода исчерпан")
    if count_uses(db, promo.id, customer_id) >= promo.per_customer_limit:
        raise HTTPException(status_code=400, detail="Вы уже использовали этот промокод")
    return promo
