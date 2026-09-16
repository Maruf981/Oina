from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.dual_slide import DualSlide
from app.schemas.dual_slide import DualSlideCreate, DualSlideOut

router = APIRouter(prefix="/dual-slides", tags=["dual-slides"])


@router.get("/", response_model=list[DualSlideOut])
def list_slides(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(DualSlide)
    if active_only:
        query = query.filter(DualSlide.is_active == True)
    return query.order_by(DualSlide.sort_order.asc(), DualSlide.id.asc()).all()


@router.post("/", response_model=DualSlideOut)
def create_slide(data: DualSlideCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    slide = DualSlide(**data.model_dump())
    db.add(slide)
    db.commit()
    db.refresh(slide)
    return slide


@router.patch("/{slide_id}", response_model=DualSlideOut)
def update_slide(slide_id: int, data: DualSlideCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    slide = db.query(DualSlide).filter(DualSlide.id == slide_id).first()
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    for key, value in data.model_dump().items():
        setattr(slide, key, value)
    db.commit()
    db.refresh(slide)
    return slide


@router.delete("/{slide_id}")
def delete_slide(slide_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    slide = db.query(DualSlide).filter(DualSlide.id == slide_id).first()
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    db.delete(slide)
    db.commit()
    return {"status": "deleted"}
