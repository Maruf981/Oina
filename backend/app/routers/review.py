from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_customer
from app.models.customer import Customer
from app.repositories import review as review_repo
from app.schemas.review import ReviewCreate, ReviewOut

router = APIRouter(prefix="/products", tags=["reviews"])


@router.post("/{product_id}/reviews", response_model=ReviewOut)
def submit_review(
    product_id: int,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current: Customer = Depends(get_current_customer),
):
    return review_repo.upsert_review(db, product_id, current.id, data.rating)


@router.get("/{product_id}/reviews/me", response_model=ReviewOut | None)
def get_my_review(
    product_id: int,
    db: Session = Depends(get_db),
    current: Customer = Depends(get_current_customer),
):
    return review_repo.get_my_review(db, product_id, current.id)
