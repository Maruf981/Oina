from pydantic import BaseModel
from app.schemas.product import ProductPublicOut


class FavoriteOut(BaseModel):
    id: int
    product: ProductPublicOut

    class Config:
        from_attributes = True
