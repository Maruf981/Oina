from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.repositories import category as category_repo
from app.schemas.category import CategoryCreate, CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryOut])
def list_categories(include_archived: bool = False, db: Session = Depends(get_db)):
    return category_repo.get_all(db, include_archived=include_archived)


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: int, db: Session = Depends(get_db)):
    category = category_repo.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/", response_model=CategoryOut)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    return category_repo.create(db, data)


@router.delete("/{category_id}", response_model=CategoryOut)
def archive_category(category_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    category = category_repo.archive(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/{category_id}/restore", response_model=CategoryOut)
def restore_category(category_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    category = category_repo.restore(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category