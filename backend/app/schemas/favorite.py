from pydantic import BaseModel
from app.schemas.product import ProductOut


class FavoriteOut(BaseModel):
    id: int
    product: ProductOut

    class Config:
        from_attributes = True
