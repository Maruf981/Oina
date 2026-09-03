from datetime import datetime, date
from sqlalchemy import String, Numeric, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Expense(Base):
    __tablename__ = "expenses"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    expense_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
