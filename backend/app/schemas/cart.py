from pydantic import BaseModel
from app.schemas.product import ProductVariantOut, ProductPublicOut


class CartItemVariantOut(ProductVariantOut):
    product: ProductPublicOut

    class Config:
        from_attributes = True


class CartItemOut(BaseModel):
    id: int
    quantity: int
    variant: CartItemVariantOut

    class Config:
        from_attributes = True


class CartItemCreate(BaseModel):
    product_variant_id: int
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int
