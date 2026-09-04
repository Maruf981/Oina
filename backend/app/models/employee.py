from datetime import datetime, date

from sqlalchemy import String, Numeric, Boolean, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    salary: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    hire_date: Mapped["date | None"] = mapped_column(Date, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
