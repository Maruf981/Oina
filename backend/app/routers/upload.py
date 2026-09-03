import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_customer
from app.models.product import Product, ProductImage
from app.models.customer import Customer

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
@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: Customer = Depends(get_current_customer),
):
    result = cloudinary.uploader.upload(
        file.file,
        folder="oina/avatars",
    )
    current.avatar_url = result["secure_url"]
    db.commit()
    db.refresh(current)
    return {"avatar_url": current.avatar_url}
