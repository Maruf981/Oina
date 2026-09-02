from datetime import datetime, date
from pydantic import BaseModel
class SizeGuideRow(BaseModel):
    size: str
    chest: str | None = None
    waist: str | None = None
    garment_length: str | None = None
    sleeve_length: str | None = None
    shoulder_width: str | None = None

class CategoryBrief(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


class ProductVariantBase(BaseModel):
    size: str
    color: str
    stock: int = 0
    sku: str | None = None


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantOut(ProductVariantBase):
    id: int

    class Config:
        from_attributes = True


class ProductImageOut(BaseModel):
    id: int
    url: str
    color: str | None = None
    sort_order: int
    media_type: str = "image"

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    category_id: int
    supplier_id: int | None = None
    catalog_number: str | None = None
    title_ru: str
    title_tj: str | None = None
    description_ru: str | None = None
    description_tj: str | None = None
    price: float
    cost_price: float | None = None
    material_ru: str | None = None
    material_tj: str | None = None
    country_of_origin_ru: str | None = None
    country_of_origin_tj: str | None = None
    care_instructions_ru: str | None = None
    care_instructions_tj: str | None = None
    season_ru: str | None = None
    season_tj: str | None = None
    pattern_ru: str | None = None
    pattern_tj: str | None = None
    is_active: bool = True
    is_featured: bool = False
    is_new: bool = False
    is_brand: bool = False
    size_guide: list[SizeGuideRow] | None = None
    discount_percent: int | None = None
    discount_from: date | None = None
    discount_to: date | None = None


class ProductCreate(ProductBase):
    variants: list[ProductVariantCreate] = []


class ProductOut(ProductBase):
    id: int
    created_at: datetime
    variants: list[ProductVariantOut] = []
    images: list[ProductImageOut] = []
    category: CategoryBrief | None = None
    avg_rating: float | None = None
    review_count: int = 0

    class Config:
        from_attributes = True