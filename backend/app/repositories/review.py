from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.review import ProductReview
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import ProductVariant


def has_delivered_purchase(db: Session, customer_id: int, product_id: int) -> bool:
    """Проверяет, есть ли у клиента ДОСТАВЛЕННЫЙ заказ, включающий этот товар
    (в любом варианте размера/цвета) — условие для права оставить отзыв."""
    return (
        db.query(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .join(ProductVariant, ProductVariant.id == OrderItem.product_variant_id)
        .filter(
            Order.customer_id == customer_id,
            Order.status == OrderStatus.DELIVERED,
            ProductVariant.product_id == product_id,
        )
        .first()
        is not None
    )


def upsert_review(db: Session, product_id: int, customer_id: int, rating: int) -> ProductReview:
    if not has_delivered_purchase(db, customer_id, product_id):
        raise HTTPException(
            status_code=403,
            detail="Оставить отзыв можно только на товар из доставленного заказа",
        )

    existing = (
        db.query(ProductReview)
        .filter(ProductReview.product_id == product_id, ProductReview.customer_id == customer_id)
        .first()
    )
    if existing:
        existing.rating = rating
        db.commit()
        db.refresh(existing)
        return existing

    review = ProductReview(product_id=product_id, customer_id=customer_id, rating=rating)
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def get_my_review(db: Session, product_id: int, customer_id: int) -> ProductReview | None:
    return (
        db.query(ProductReview)
        .filter(ProductReview.product_id == product_id, ProductReview.customer_id == customer_id)
        .first()
    )
