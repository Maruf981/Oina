from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate


def get_all(db: Session, include_archived: bool = False) -> list[Category]:
    query = db.query(Category)
    if not include_archived:
        query = query.filter(Category.is_archived == False)
    return query.all()


def get_by_id(db: Session, category_id: int) -> Category | None:
    return db.query(Category).filter(Category.id == category_id).first()


def create(db: Session, data: CategoryCreate) -> Category:
    category = Category(**data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def archive(db: Session, category_id: int) -> Category | None:
    category = get_by_id(db, category_id)
    if not category:
        return None
    category.is_archived = True
    db.commit()
    db.refresh(category)
    return category


def restore(db: Session, category_id: int) -> Category | None:
    category = get_by_id(db, category_id)
    if not category:
        return None
    category.is_archived = False
    db.commit()
    db.refresh(category)
    return category