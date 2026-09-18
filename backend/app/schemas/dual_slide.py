from datetime import datetime
from pydantic import BaseModel

from app.schemas.home_banner import HomeBannerCategoryBrief


class DualSlideBase(BaseModel):
    title: str
    subtitle: str | None = None
    button_text: str | None = None
    text_color: str = "#FFFFFF"
    category_id: int | None = None
    sort_order: int = 0
    is_active: bool = True
    left_label_ru: str | None = None
    left_label_tj: str | None = None
    center_label_ru: str | None = None
    center_label_tj: str | None = None
    right_label_ru: str | None = None
    right_label_tj: str | None = None


class DualSlideCreate(DualSlideBase):
    pass


class DualSlideOut(DualSlideBase):
    id: int
    left_image_url: str | None = None
    right_image_url: str | None = None
    center_image_url: str | None = None
    created_at: datetime
    category: HomeBannerCategoryBrief | None = None

    class Config:
        from_attributes = True
