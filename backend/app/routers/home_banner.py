from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.home_banner import HomeBanner
from app.schemas.home_banner import HomeBannerCreate, HomeBannerOut

router = APIRouter(prefix="/banners", tags=["banners"])


@router.get("/", response_model=list[HomeBannerOut])
def list_banners(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(HomeBanner)
    if active_only:
        query = query.filter(HomeBanner.is_active == True)
    return query.order_by(HomeBanner.sort_order.asc()).all()


@router.post("/", response_model=HomeBannerOut)
def create_banner(data: HomeBannerCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    banner = HomeBanner(**data.model_dump())
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


@router.patch("/{banner_id}", response_model=HomeBannerOut)
def update_banner(banner_id: int, data: HomeBannerCreate, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    banner = db.query(HomeBanner).filter(HomeBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    for key, value in data.model_dump().items():
        setattr(banner, key, value)
    db.commit()
    db.refresh(banner)
    return banner


@router.delete("/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    banner = db.query(HomeBanner).filter(HomeBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    db.delete(banner)
    db.commit()
    return {"status": "deleted"}
