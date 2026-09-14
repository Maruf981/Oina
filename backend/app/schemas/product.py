from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator, model_validator
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
    stock: int = Field(default=0, ge=0)
    sku: str | None = None


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantOut(ProductVariantBase):
    id: int

    class Config:
        from_attributes = True


CARD_TRANSFORM = "c_fill,ar_3:4,g_center,q_auto,f_auto"


class ProductImageOut(BaseModel):
    id: int
    url: str
    color: str | None = None
    sort_order: int
    media_type: str = "image"

    @model_validator(mode="after")
    def apply_card_transform(self):
        if self.media_type == "image" and "/upload/" in self.url:
            if "/upload/c_" not in self.url and "/upload/ar_" not in self.url:
                self.url = self.url.replace("/upload/", f"/upload/{CARD_TRANSFORM}/", 1)
        return self

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
    is_recommended: bool = False
    size_guide: list[SizeGuideRow] | None = None
    discount_percent: int | None = None
    discount_from: date | None = None
    discount_to: date | None = None
    original_price: float | None = None


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
    sold_count: int = 0

    class Config:
        from_attributes = True