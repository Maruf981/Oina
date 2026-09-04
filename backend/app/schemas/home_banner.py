from datetime import datetime

from pydantic import BaseModel


class HomeBannerBase(BaseModel):
    title: str
    subtitle: str | None = None
    text_color: str = "#FFFFFF"
    product_id: int
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


class HomeBannerOut(HomeBannerBase):
    id: int
    image_url: str | None = None
    created_at: datetime
    product: HomeBannerProductBrief | None = None

    class Config:
        from_attributes = True
