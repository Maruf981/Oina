from datetime import datetime

from pydantic import BaseModel


class OrderItemCreate(BaseModel):
    product_variant_id: int
    quantity: int


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    delivery_address: str
    comment: str | None = None
    payment_method: str
    items: list[OrderItemCreate]


class OrderItemOut(BaseModel):
    id: int
    product_variant_id: int
    quantity: int
    price_at_order: float

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    status: str
    payment_method: str | None
    delivery_address: str | None
    comment: str | None
    total: float
    created_at: datetime
    items: list[OrderItemOut]

    class Config:
        from_attributes = True