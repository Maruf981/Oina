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


class DualSlideCreate(DualSlideBase):
    pass


class DualSlideOut(DualSlideBase):
    id: int
    left_image_url: str | None = None
    right_image_url: str | None = None
    created_at: datetime
    category: HomeBannerCategoryBrief | None = None

    class Config:
        from_attributes = True
