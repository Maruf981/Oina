"""Единая логика скидки (вариант B).
price — всегда обычная цена. Скидка = % + даты. Цена со скидкой вычисляется только здесь.
Дата — по Душанбе (UTC+5, без летнего времени), период включительно."""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import and_, case, func, or_

DUSHANBE_TZ = timezone(timedelta(hours=5))


def today_dushanbe() -> date:
    return datetime.now(DUSHANBE_TZ).date()


def is_discount_active(p, today: date | None = None) -> bool:
    pct = p.discount_percent
    if not pct or pct <= 0 or pct >= 100:
        return False
    today = today or today_dushanbe()
    if p.discount_from and p.discount_from > today:
        return False
    if p.discount_to and p.discount_to < today:
        return False
    return True


def current_price(p, today: date | None = None) -> float:
    base = Decimal(str(p.price))
    if not is_discount_active(p, today):
        return float(base)
    discounted = (base * (100 - p.discount_percent) / 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return float(discounted)


def discount_active_sql(Product, today: date | None = None):
    today = today or today_dushanbe()
    return and_(
        Product.discount_percent.isnot(None),
        Product.discount_percent > 0,
        Product.discount_percent < 100,
        or_(Product.discount_from.is_(None), Product.discount_from <= today),
        or_(Product.discount_to.is_(None), Product.discount_to >= today),
    )


def current_price_sql(Product, today: date | None = None):
    return case(
        (discount_active_sql(Product, today), func.round(Product.price * (100 - Product.discount_percent) / 100)),
        else_=Product.price,
    )
