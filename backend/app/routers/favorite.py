from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_customer
from app.models.customer import Customer
from app.models.favorite import Favorite
from app.models.product import Product
from app.schemas.favorite import FavoriteOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("/", response_model=list[FavoriteOut])
def list_favorites(db: Session = Depends(get_db), customer: Customer = Depends(get_current_customer)):
    return db.query(Favorite).filter(Favorite.customer_id == customer.id).all()


@router.post("/{product_id}")
def add_favorite(product_id: int, db: Session = Depends(get_db), customer: Customer = Depends(get_current_customer)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = (
        db.query(Favorite)
        .filter(Favorite.customer_id == customer.id, Favorite.product_id == product_id)
        .first()
    )
    if existing:
        return {"status": "already_added"}
    db.add(Favorite(customer_id=customer.id, product_id=product_id))
    db.commit()
    return {"status": "added"}


@router.delete("/{product_id}")
def remove_favorite(product_id: int, db: Session = Depends(get_db), customer: Customer = Depends(get_current_customer)):
    fav = (
        db.query(Favorite)
        .filter(Favorite.customer_id == customer.id, Favorite.product_id == product_id)
        .first()
    )
    if fav:
        db.delete(fav)
        db.commit()
    return {"status": "removed"}
