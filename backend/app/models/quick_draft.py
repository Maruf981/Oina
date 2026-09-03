from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class QuickDraft(Base):
    __tablename__ = "quick_drafts"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    cost_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    category_id: Mapped[int | None] = mapped_column(nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    colors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    size_guide: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
