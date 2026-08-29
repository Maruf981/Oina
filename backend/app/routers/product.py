from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.repositories import product as product_repo
from app.schemas.product import ProductCreate, ProductOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/admin/all", response_model=list[ProductOut])
def list_all_products_admin(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    from app.models.product import Product
    return db.query(Product).order_by(Product.id.desc()).all()


@router.get("/", response_model=list[ProductOut])
def list_products(
    category_id: int | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    size: str | None = None,
    color: str | None = None,
    db: Session = Depends(get_db),
):
    return product_repo.get_all(
        db,
        category_id=category_id,
        search=search,
        min_price=min_price,
        max_price=max_price,
        size=size,
        color=color,
    )


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = product_repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/", response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    return product_repo.create(db, data)