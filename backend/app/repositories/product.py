from sqlalchemy.orm import Session

from app.models.product import Product, ProductVariant
from app.schemas.product import ProductCreate


def get_all(db: Session, category_id: int | None = None) -> list[Product]:
    query = db.query(Product).filter(Product.is_active == True)
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)
    return query.all()


def get_by_id(db: Session, product_id: int) -> Product | None:
    return db.query(Product).filter(Product.id == product_id).first()


def create(db: Session, data: ProductCreate) -> Product:
    variants_data = data.variants
    product_data = data.model_dump(exclude={"variants"})

    product = Product(**product_data)
    db.add(product)
    db.flush()

    for variant in variants_data:
        db.add(ProductVariant(product_id=product.id, **variant.model_dump()))

    db.commit()
    db.refresh(product)
    return product