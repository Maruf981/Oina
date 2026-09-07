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
    quantity: int | None = None



class ExchangeRequest(BaseModel):
    phone: str
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
    delivery_address: str | None
    comment: str | None
    total: float
    created_at: datetime
    items: list[OrderItemOut]
    customer: CustomerBrief

    class Config:
        from_attributes = True