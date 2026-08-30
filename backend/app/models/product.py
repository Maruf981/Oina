from datetime import datetime, date

from sqlalchemy import String, Numeric, ForeignKey, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    catalog_number: Mapped[str] = mapped_column(String(20), unique=True)
    title_ru: Mapped[str] = mapped_column(String(200))
    title_tj: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description_ru: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    description_tj: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    material_ru: Mapped[str | None] = mapped_column(String(200), nullable=True)
    material_tj: Mapped[str | None] = mapped_column(String(200), nullable=True)
    country_of_origin_ru: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country_of_origin_tj: Mapped[str | None] = mapped_column(String(100), nullable=True)
    care_instructions_ru: Mapped[str | None] = mapped_column(String(500), nullable=True)
    care_instructions_tj: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)
    discount_percent: Mapped[int | None] = mapped_column(nullable=True)
    discount_from: Mapped["date | None"] = mapped_column(nullable=True)
    discount_to: Mapped["date | None"] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    category: Mapped["Category"] = relationship(back_populates="products")
    supplier: Mapped["Supplier | None"] = relationship(back_populates="products")
    variants: Mapped[list["ProductVariant"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    images: Mapped[list["ProductImage"]] = relationship(back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    size: Mapped[str] = mapped_column(String(10))
    color: Mapped[str] = mapped_column(String(50))
    stock: Mapped[int] = mapped_column(default=0)
    sku: Mapped[str] = mapped_column(String(50), unique=True)

    product: Mapped["Product"] = relationship(back_populates="variants")


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    url: Mapped[str] = mapped_column(String(500))
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)

    product: Mapped["Product"] = relationship(back_populates="images")
