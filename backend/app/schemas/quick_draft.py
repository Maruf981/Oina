from datetime import datetime
from pydantic import BaseModel
from app.schemas.product import SizeGuideRow


class ColorSizeEntry(BaseModel):
    size: str
    stock: int


class QuickDraftColor(BaseModel):
    color: str
    size_type: str
    sizes: list[ColorSizeEntry]


class QuickDraftCreate(BaseModel):
    title: str
    price: float | None = None
    cost_price: float | None = None
    category_id: int | None = None
    colors: list[QuickDraftColor] | None = None
    size_guide: list[SizeGuideRow] | None = None


class QuickDraftOut(BaseModel):
    id: int
    title: str
    price: float | None
    cost_price: float | None
    category_id: int | None
    image_url: str | None
    colors: list[dict] | None
    size_guide: list[dict] | None
    created_at: datetime

    class Config:
        from_attributes = True
