from fastapi import APIRouter, Depends, HTTPException
from app.services.pricing import current_price, is_discount_active
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.product import Product

router = APIRouter(prefix="/social-preview", tags=["social-preview"])

SITE = "t.oina.tj"
PHONE = "xxxxxxxxx"
TELEGRAM_CHANNEL = "t.me/oina_channel_tj"
INSTAGRAM_LINK = "instagram.com/t.oina.tj"
TIKTOK_LINK = "tiktok.com/@oina.tj"


def cloudinary_resize(url: str, transform: str) -> str:
    if "/upload/" not in url:
        return url
    return url.replace("/upload/", f"/upload/{transform}/", 1)


def _fmt_price(v) -> str:
    return f"{float(v):g}"


def build_caption_base(product: Product) -> list[str]:
    """Сначала ключевое (название, цена, размеры, цвета), потом остальные поля. Пустые поля пропускаются."""
    lines = [f"🛍️ {product.title_ru}"]
    if product.is_new:
        lines.append("🆕 Новинка")

    price_line = f"💰 Цена: {_fmt_price(current_price(product))} смн"
    if is_discount_active(product):
        price_line += f" (было {_fmt_price(product.price)} смн, скидка {product.discount_percent}%)"
        if product.discount_to:
            price_line += f" — до {product.discount_to.strftime('%d.%m')}"
    lines.append(price_line)

    in_stock = [v for v in product.variants if v.stock > 0]
    sizes = list(dict.fromkeys(v.size for v in in_stock))
    colors = list(dict.fromkeys(v.color for v in in_stock))
    if sizes:
        lines.append(f"📏 Размеры в наличии: {', '.join(sizes)}")
    if colors:
        lines.append(f"🎨 Цвета: {', '.join(colors)}")
    lines.append(f"🔖 Артикул: {product.catalog_number}")

    extra = [
        ("📂 Категория", product.category.name if product.category else None),
        ("👕 Тип", product.product_type_ru),
        ("🏷️ Бренд", product.brand),
        ("🧵 Материал", product.material_ru),
        ("🌦️ Сезон", product.season_ru),
        ("📐 Посадка", product.fit_ru),
        ("✨ Стиль", product.style_ru),
        ("🔳 Узор", product.pattern_ru),
        ("🌍 Страна", product.country_of_origin_ru),
        ("🧺 Уход", product.care_instructions_ru),
    ]
    rest = [f"{label}: {value.strip()}" for label, value in extra if value and str(value).strip()]
    if rest:
        lines.append("")
        lines.extend(rest)
    if product.description_ru and product.description_ru.strip():
        lines.append("")
        lines.append(product.description_ru.strip())
    return lines


def _order_block(product: Product) -> list[str]:
    return ["", f"🔗 Товар: {SITE}/product/{product.id}", f"📞 Телефон: {PHONE}"]


def build_caption_instagram(product: Product) -> str:
    lines = build_caption_base(product) + _order_block(product)
    lines.append(f"📢 Telegram: {TELEGRAM_CHANNEL}")
    lines.append(f"🎵 TikTok: {TIKTOK_LINK}")
    return "\n".join(lines)


def build_caption_tiktok(product: Product) -> str:
    lines = build_caption_base(product) + _order_block(product)
    lines.append(f"📢 Telegram: {TELEGRAM_CHANNEL}")
    lines.append(f"📸 Instagram: {INSTAGRAM_LINK}")
    return "\n".join(lines)


def build_caption_telegram(product: Product) -> str:
    lines = build_caption_base(product) + _order_block(product)
    lines.append(f"📸 Instagram: {INSTAGRAM_LINK}")
    lines.append(f"🎵 TikTok: {TIKTOK_LINK}")
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
        "price": current_price(product),
        "discount_percent": product.discount_percent if is_discount_active(product) else None,
        "post_image_url": post_url,
        "story_image_url": story_url,
        "caption_instagram": build_caption_instagram(product),
        "caption_tiktok": build_caption_tiktok(product),
        "caption_telegram": build_caption_telegram(product),
    }
