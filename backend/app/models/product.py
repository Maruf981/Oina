from datetime import datetime, date
from sqlalchemy import String, Numeric, ForeignKey, Boolean, DateTime, JSON, func, select, text
from sqlalchemy.orm import Mapped, mapped_column, relationship, column_property
from app.core.database import Base
from app.models.review import ProductReview


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
    cost_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    material_ru: Mapped[str | None] = mapped_column(String(200), nullable=True)
    material_tj: Mapped[str | None] = mapped_column(String(200), nullable=True)
    country_of_origin_ru: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country_of_origin_tj: Mapped[str | None] = mapped_column(String(100), nullable=True)
    care_instructions_ru: Mapped[str | None] = mapped_column(String(500), nullable=True)
    care_instructions_tj: Mapped[str | None] = mapped_column(String(500), nullable=True)
    season_ru: Mapped[str | None] = mapped_column(String(100), nullable=True)
    season_tj: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pattern_ru: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pattern_tj: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)
    is_brand: Mapped[bool] = mapped_column(Boolean, default=False)
    size_guide: Mapped[list | None] = mapped_column(JSON, nullable=True)
    discount_percent: Mapped[int | None] = mapped_column(nullable=True)
    discount_from: Mapped["date | None"] = mapped_column(nullable=True)
    discount_to: Mapped["date | None"] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    category: Mapped["Category"] = relationship(back_populates="products")
    supplier: Mapped["Supplier | None"] = relationship(back_populates="products")
    variants: Mapped[list["ProductVariant"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    images: Mapped[list["ProductImage"]] = relationship(back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    size: Mapped[str] = mapped_column(String(20))
    color: Mapped[str] = mapped_column(String(50))
    stock: Mapped[int] = mapped_column(default=0)
    sku: Mapped[str] = mapped_column(String(50), unique=True)

    product: Mapped["Product"] = relationship(back_populates="variants")

    @property
    def title_ru(self) -> str:
        return self.product.title_ru

    @property
    def title_tj(self) -> str | None:
        return self.product.title_tj

    @property
    def catalog_number(self) -> str:
        return self.product.catalog_number


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    url: Mapped[str] = mapped_column(String(500))
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)
    media_type: Mapped[str] = mapped_column(String(10), default="image")

    product: Mapped["Product"] = relationship(back_populates="images")

Product.avg_rating = column_property(
    select(func.avg(ProductReview.rating))
    .where(ProductReview.product_id == Product.id)
    .correlate_except(ProductReview)
    .scalar_subquery()
)
Product.review_count = column_property(
    select(func.count(ProductReview.id))
    .where(ProductReview.product_id == Product.id)
    .correlate_except(ProductReview)
    .scalar_subquery()
)
