import re
from datetime import date, datetime

from pydantic import BaseModel, field_validator

from app.schemas.order import OrderItemCreate

CODE_RE = re.compile(r"^[A-Z0-9]{3,32}$")


def _percent(v):
    if v is not None and (v < 5 or v > 50 or v % 5):
        raise ValueError("Процент: от 5 до 50, шаг 5")
    return v


def _positive(v):
    if v is not None and v < 1:
        raise ValueError("Должно быть не меньше 1")
    return v


def _min_total(v):
    if v is not None and v < 0:
        raise ValueError("Не может быть отрицательной")
    return v


class PromoCodeCreate(BaseModel):
    code: str
    percent: int
    starts_on: date | None = None
    ends_on: date | None = None
    max_uses: int | None = None
    per_customer_limit: int = 1
    min_order_total: float | None = None
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def v_code(cls, v):
        v = (v or "").strip().upper()
        if not CODE_RE.match(v):
            raise ValueError("Код: 3–32 символа, только латинские буквы и цифры")
        return v

    @field_validator("percent")
    @classmethod
    def v_percent(cls, v):
        return _percent(v)

    @field_validator("max_uses", "per_customer_limit")
    @classmethod
    def v_limits(cls, v):
        return _positive(v)

    @field_validator("min_order_total")
    @classmethod
    def v_min(cls, v):
        return _min_total(v)


class PromoCodeUpdate(BaseModel):
    percent: int | None = None
    starts_on: date | None = None
    ends_on: date | None = None
    max_uses: int | None = None
    per_customer_limit: int | None = None
    min_order_total: float | None = None
    is_active: bool | None = None

    @field_validator("percent")
    @classmethod
    def v_percent(cls, v):
        return _percent(v)

    @field_validator("max_uses", "per_customer_limit")
    @classmethod
    def v_limits(cls, v):
        return _positive(v)

    @field_validator("min_order_total")
    @classmethod
    def v_min(cls, v):
        return _min_total(v)


class PromoCodeOut(BaseModel):
    id: int
    code: str
    percent: int
    starts_on: date | None
    ends_on: date | None
    max_uses: int | None
    per_customer_limit: int
    min_order_total: float | None
    is_active: bool
    created_at: datetime
    used_count: int = 0

    class Config:
        from_attributes = True


class PromoCheckRequest(BaseModel):
    code: str
    items: list[OrderItemCreate]


class PromoCheckOut(BaseModel):
    code: str
    percent: int
    subtotal: float
    discount: float
    total: float
