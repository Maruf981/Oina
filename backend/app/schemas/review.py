from datetime import datetime
from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)


class ReviewOut(BaseModel):
    id: int
    product_id: int
    customer_id: int
    rating: int
    created_at: datetime

    class Config:
        from_attributes = True
