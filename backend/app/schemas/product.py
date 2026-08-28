from datetime import datetime

from pydantic import BaseModel


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
    sort_order: int

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    category_id: int
    catalog_number: str
    title: str
    description: str | None = None
    price: float
    is_active: bool = True


class ProductCreate(ProductBase):
    variants: list[ProductVariantCreate] = []


class ProductOut(ProductBase):
    id: int
    created_at: datetime
    variants: list[ProductVariantOut] = []
    images: list[ProductImageOut] = []

    class Config:
        from_attributes = True