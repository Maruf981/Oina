from sqlalchemy.orm import Session
from app.models.review import ProductReview


def upsert_review(db: Session, product_id: int, customer_id: int, rating: int) -> ProductReview:
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
