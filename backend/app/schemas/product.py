from datetime import datetime

from pydantic import BaseModel


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
    sku: str


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
    material_ru: str | None = None
    material_tj: str | None = None
    country_of_origin_ru: str | None = None
    country_of_origin_tj: str | None = None
    care_instructions_ru: str | None = None
    care_instructions_tj: str | None = None
    is_active: bool = True


class ProductCreate(ProductBase):
    variants: list[ProductVariantCreate] = []


class ProductOut(ProductBase):
    id: int
    created_at: datetime
    variants: list[ProductVariantOut] = []
    images: list[ProductImageOut] = []
    category: CategoryBrief | None = None

    class Config:
        from_attributes = True