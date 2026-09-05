from datetime import datetime

from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class HomeBanner(Base):
    __tablename__ = "home_banners"

    id: Mapped[int] = mapped_column(primary_key=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    subtitle: Mapped[str | None] = mapped_column(String(300), nullable=True)
    text_color: Mapped[str] = mapped_column(String(20), default="#FFFFFF", server_default="#FFFFFF")
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    product: Mapped["Product | None"] = relationship()
    category: Mapped["Category | None"] = relationship()
