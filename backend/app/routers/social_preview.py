from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.product import Product

router = APIRouter(prefix="/social-preview", tags=["social-preview"])

TELEGRAM_CHANNEL = "t.me/oina_channel_tj"
INSTAGRAM_LINK = "instagram.com/oina._tj"
TIKTOK_LINK = "tiktok.com/@oina.tj"


def cloudinary_resize(url: str, transform: str) -> str:
    if "/upload/" not in url:
        return url
    return url.replace("/upload/", f"/upload/{transform}/", 1)


def build_caption_base(product: Product) -> list[str]:
    lines = [f"🛍️ {product.title_ru}"]

    price_line = f"💰 Цена: {product.price} смн"
    if product.discount_percent:
        price_line += f" (скидка {product.discount_percent}%)"
    lines.append(price_line)

    in_stock = [v for v in product.variants if v.stock > 0]
    sizes = sorted({v.size for v in in_stock})
    colors = sorted({v.color for v in in_stock})

    if sizes:
        lines.append(f"📏 Размеры в наличии: {', '.join(sizes)}")
    if colors:
        lines.append(f"🎨 Цвета: {', '.join(colors)}")

    return lines


def build_caption_instagram(product: Product) -> str:
    lines = build_caption_base(product)
    lines.append(f"📩 Заказ: сайт oina.tj")
    lines.append(f"📢 Telegram: {TELEGRAM_CHANNEL}")
    lines.append(f"🎵 TikTok: {TIKTOK_LINK}")
    return "\n".join(lines)


def build_caption_tiktok(product: Product) -> str:
    lines = build_caption_base(product)
    lines.append(f"📩 Заказ: сайт oina.tj")
    lines.append(f"📢 Telegram: {TELEGRAM_CHANNEL}")
    lines.append(f"📸 Instagram: {INSTAGRAM_LINK}")
    return "\n".join(lines)


@router.get("/{product_id}")
def get_social_preview(
    product_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    if not product.images:
        raise HTTPException(status_code=400, detail="У товара нет фото")

    source_url = product.images[0].url
    post_url = source_url
    story_url = cloudinary_resize(source_url, "c_fill,g_auto,w_1080,h_1920")

    return {
        "product_id": product.id,
        "title": product.title_ru,
        "price": float(product.price),
        "discount_percent": product.discount_percent,
        "post_image_url": post_url,
        "story_image_url": story_url,
        "caption_instagram": build_caption_instagram(product),
        "caption_tiktok": build_caption_tiktok(product),
    }
