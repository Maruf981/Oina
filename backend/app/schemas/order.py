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
    is_dushanbe: bool = True
    items: list[OrderItemCreate]
    promo_code: str | None = None


class VariantBrief(BaseModel):
    id: int
    size: str
    color: str
    title_ru: str
    title_tj: str | None
    catalog_number: str
    class Config:
        from_attributes = True
class OrderItemOut(BaseModel):
    id: int
    product_variant_id: int
    quantity: int
    price_at_order: float
    is_returned: bool = False
    returned_quantity: int = 0
    variant: VariantBrief | None = None
    class Config:
        from_attributes = True


class ReturnItemRequest(BaseModel):
    phone: str
    telegram_id: int | None = None
    quantity: int | None = None
    reason: str | None = None



class ExchangeRequest(BaseModel):
    phone: str
    telegram_id: int | None = None
    is_dushanbe: bool
    current_item: str
    desired_size: str
    desired_color: str
    availability_note: str | None = None
    comment: str | None = None



class ExchangeVariantRequest(BaseModel):
    new_variant_id: int


class OrderStatusUpdate(BaseModel):
    status: str


class CustomerBrief(BaseModel):
    id: int
    name: str | None
    phone: str

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    status: str
    payment_method: str | None
    is_dushanbe: bool = True
    delivery_address: str | None
    comment: str | None
    total: float
    promo_code: str | None = None
    promo_percent: int | None = None
    created_at: datetime
    items: list[OrderItemOut]
    customer: CustomerBrief

    class Config:
        from_attributes = True


class OrderItemAdminOut(OrderItemOut):
    cost_at_order: float | None = None


class OrderAdminOut(OrderOut):
    source: str = "site"
    items: list[OrderItemAdminOut]
