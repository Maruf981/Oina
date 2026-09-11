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


def upsert_review(db: Session, product_id: int, customer_id: int, rating: int, comment: str | None = None) -> ProductReview:
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
        existing.comment = comment
        db.commit()
        db.refresh(existing)
        return existing

    review = ProductReview(product_id=product_id, customer_id=customer_id, rating=rating, comment=comment)
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


def get_homepage_reviews(db: Session, limit: int = 8) -> list[dict]:
    """Недавние отзывы С ТЕКСТОМ комментария — для витрины на главной странице."""
    reviews = (
        db.query(ProductReview)
        .filter(ProductReview.comment.isnot(None), ProductReview.comment != "")
        .order_by(ProductReview.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for r in reviews:
        product = r.product
        customer = r.customer
        image_url = product.images[0].url if product.images else None
        result.append({
            "id": r.id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
            "product_id": product.id,
            "product_title_ru": product.title_ru,
            "product_title_tj": product.title_tj,
            "product_image": image_url,
            "customer_name": customer.name,
        })
    return result
