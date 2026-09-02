from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, String, Numeric, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_variant_id: Mapped[int] = mapped_column(ForeignKey("product_variants.id"))
    movement_type: Mapped[str] = mapped_column(String(20))  # incoming, sale, return, adjustment, writeoff
    quantity: Mapped[int] = mapped_column(Integer)  # signed: + increases stock, - decreases stock
    cost_price_at_time: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    variant: Mapped["ProductVariant"] = relationship()
