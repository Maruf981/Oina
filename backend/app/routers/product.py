from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_admin_optional
from app.repositories import product as product_repo
from app.schemas.product import ProductCreate, ProductOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/admin/all", response_model=list[ProductOut])
def list_all_products_admin(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    from app.models.product import Product
    return db.query(Product).filter(Product.is_archived == False).order_by(Product.id.desc()).all()


@router.get("/admin/archived", response_model=list[ProductOut])
def list_archived_products_admin(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    from app.models.product import Product
    return db.query(Product).filter(Product.is_archived == True).order_by(Product.id.desc()).all()
@router.post("/{product_id}/restore")
def restore_product(product_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    product = product_repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_archived = False
    product.is_active = False
    db.commit()
    return {"status": "restored"}
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
def get_product(product_id: int, db: Session = Depends(get_db), is_admin: bool = Depends(get_current_admin_optional)):
    product = product_repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.is_archived:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.is_active and not is_admin:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/", response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    return product_repo.create(db, data)


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    product = product_repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_repo.update(db, product, data)


@router.post("/{product_id}/publish")
def publish_product(product_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    product = product_repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = True
    db.commit()
    return {"status": "published"}


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    product = product_repo.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_archived = True
    product.is_active = False
    db.commit()
    return {"status": "archived"}