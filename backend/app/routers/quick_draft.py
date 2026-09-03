import json

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.quick_draft import QuickDraft
from app.schemas.quick_draft import QuickDraftOut

router = APIRouter(prefix="/quick-drafts", tags=["quick-drafts"])


@router.post("/", response_model=QuickDraftOut)
async def create_quick_draft(
    title: str = Form(...),
    price: str = Form(""),
    cost_price: str = Form(""),
    category_id: str = Form(""),
    colors: str = Form("[]"),
    size_guide: str = Form("[]"),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    image_url = None
    if photo is not None:
        result = cloudinary.uploader.upload(
            photo.file,
            folder="oina/quick-drafts",
            resource_type="image",
        )
        image_url = result["secure_url"]

    draft = QuickDraft(
        title=title,
        price=float(price) if price else None,
        cost_price=float(cost_price) if cost_price else None,
        category_id=int(category_id) if category_id else None,
        image_url=image_url,
        colors=json.loads(colors) if colors else [],
        size_guide=json.loads(size_guide) if size_guide else [],
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.get("/", response_model=list[QuickDraftOut])
def list_quick_drafts(db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    return db.query(QuickDraft).order_by(QuickDraft.id.desc()).all()


@router.delete("/{draft_id}")
def delete_quick_draft(draft_id: int, db: Session = Depends(get_db), _: bool = Depends(get_current_admin)):
    draft = db.query(QuickDraft).filter(QuickDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    db.delete(draft)
    db.commit()
    return {"status": "deleted"}
