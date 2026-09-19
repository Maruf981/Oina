from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PromoCode(Base):
    __tablename__ = "promo_codes"
    __table_args__ = (
        CheckConstraint("percent IN (5,10,15,20,25,30,35,40,45,50)", name="ck_promo_percent"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    percent: Mapped[int] = mapped_column()
    starts_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    max_uses: Mapped[int | None] = mapped_column(nullable=True)
    per_customer_limit: Mapped[int] = mapped_column(default=1, server_default="1")
    min_order_total: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
