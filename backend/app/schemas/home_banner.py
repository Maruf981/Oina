from datetime import datetime
from pydantic import BaseModel


class HomeBannerBase(BaseModel):
    title: str
    subtitle: str | None = None
    text_color: str = "#FFFFFF"
    product_id: int | None = None
    category_id: int | None = None
    sort_order: int = 0
    is_active: bool = True


class HomeBannerCreate(HomeBannerBase):
    pass


class HomeBannerProductBrief(BaseModel):
    id: int
    title_ru: str
    catalog_number: str

    class Config:
        from_attributes = True


class HomeBannerCategoryBrief(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class HomeBannerOut(HomeBannerBase):
    id: int
    image_url: str | None = None
    created_at: datetime
    product: HomeBannerProductBrief | None = None
    category: HomeBannerCategoryBrief | None = None

    class Config:
        from_attributes = True
