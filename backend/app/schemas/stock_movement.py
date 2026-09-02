from datetime import datetime
from pydantic import BaseModel


class StockMovementCreate(BaseModel):
    product_variant_id: int
    quantity: int
    cost_price_at_time: float | None = None
    supplier_id: int | None = None
    note: str | None = None


class StockMovementOut(BaseModel):
    id: int
    product_variant_id: int
    movement_type: str
    quantity: int
    cost_price_at_time: float | None = None
    order_id: int | None = None
    supplier_id: int | None = None
    note: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
