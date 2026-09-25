import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_customer
from app.models.product import Product, ProductImage
from app.models.customer import Customer
from app.models.employee import Employee
from app.models.home_banner import HomeBanner
from app.models.dual_slide import DualSlide

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/product-image/{product_id}")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    color: str | None = None,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    image_count = db.query(ProductImage).filter(ProductImage.product_id == product_id).count()
    if image_count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images per product")

    result = cloudinary.uploader.upload(
        file.file,
        folder="oina/products",
        resource_type="auto",
    )
    media_type = "video" if result.get("resource_type") == "video" else "image"

    image = ProductImage(
        product_id=product_id,
        url=result["secure_url"],
        color=color,
        sort_order=image_count,
        media_type=media_type,
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return {"id": image.id, "url": image.url, "color": image.color, "sort_order": image.sort_order, "media_type": image.media_type}

@router.post("/product-image/{image_id}/set-primary")
async def set_primary_image(
    image_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    image = db.query(ProductImage).filter(ProductImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    siblings = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == image.product_id)
        .order_by(ProductImage.sort_order)
        .all()
    )
    siblings = [img for img in siblings if img.id != image_id]
    siblings.insert(0, image)
    for index, img in enumerate(siblings):
        img.sort_order = index
    db.commit()
    return {"ok": True}
class ReorderImagesRequest(BaseModel):
    image_ids: list[int]


@router.post("/product-image/{product_id}/reorder")
async def reorder_product_images(
    product_id: int,
    payload: ReorderImagesRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    images = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .all()
    )
    images_by_id = {img.id: img for img in images}
    if set(payload.image_ids) != set(images_by_id.keys()):
        raise HTTPException(status_code=400, detail="image_ids must match the product's existing images exactly")
    for index, image_id in enumerate(payload.image_ids):
        images_by_id[image_id].sort_order = index
    db.commit()
    return {"ok": True}


@router.delete("/product-image/{image_id}")
async def delete_product_image(
    image_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    image = db.query(ProductImage).filter(ProductImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        public_id = image.url.split("/")[-1].split(".")[0]
        resource_type = "video" if image.media_type == "video" else "image"
        cloudinary.uploader.destroy(f"oina/products/{public_id}", resource_type=resource_type)
    except Exception:
        pass
    db.delete(image)
    db.commit()
    return {"deleted": True}
@router.post("/employee-photo/{employee_id}")
async def upload_employee_photo(
    employee_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    result = cloudinary.uploader.upload(
        file.file,
        folder="oina/employees",
        resource_type="image",
    )
    employee.photo_url = result["secure_url"]
    db.commit()
    db.refresh(employee)
    return {"photo_url": employee.photo_url}


@router.post("/banner-image/{banner_id}")
async def upload_banner_image(
    banner_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    banner = db.query(HomeBanner).filter(HomeBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    is_video = (file.content_type or "").startswith("video/")
    options = {"folder": "oina/banners", "resource_type": "video" if is_video else "image"}
    if is_video:
        # убираем звук, ограничиваем ширину 1920 и сжимаем
        options["transformation"] = [{"audio_codec": "none", "width": 1920, "crop": "limit", "quality": "auto"}]
    result = cloudinary.uploader.upload(file.file, **options)
    banner.image_url = result["secure_url"]
    db.commit()
    db.refresh(banner)
    return {"image_url": banner.image_url}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: Customer = Depends(get_current_customer),
):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Можно загрузить только фото")
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Фото больше 5 МБ")
    # одно имя на клиента: новое фото заменяет старое, место в Cloudinary не копится
    result = cloudinary.uploader.upload(
        file.file,
        folder="oina/avatars",
        public_id=f"customer_{current.id}",
        overwrite=True,
        invalidate=True,
        resource_type="image",
    )
    current.avatar_url = result["secure_url"]
    db.commit()
    db.refresh(current)
    return {"avatar_url": current.avatar_url}


@router.post("/dual-slide-image/{slide_id}")
async def upload_dual_slide_image(
    slide_id: int,
    side: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    if side not in ("left", "center", "right"):
        raise HTTPException(status_code=400, detail="side must be left, center or right")
    slide = db.query(DualSlide).filter(DualSlide.id == slide_id).first()
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    content_type = file.content_type or ""
    is_video = content_type.startswith("video/")
    if not is_video and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Можно загрузить только фото или видео")
    options = {"folder": "oina/dual-slides", "resource_type": "video" if is_video else "image"}
    if is_video:
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Видео больше 50 МБ")
        # слот квадратный 1200×1200: убираем звук, ограничиваем ширину и сжимаем
        options["transformation"] = [{"audio_codec": "none", "width": 1200, "crop": "limit", "quality": "auto"}]
    result = cloudinary.uploader.upload(file.file, **options)
    setattr(slide, f"{side}_image_url", result["secure_url"])
    db.commit()
    db.refresh(slide)
    return {f"{side}_image_url": result["secure_url"]}
