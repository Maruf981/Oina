from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.product import Product, ProductVariant
from app.schemas.product import ProductCreate
from app.services.translate import translate_to_tj
from app.repositories.stock_movement import record_movement, get_variant_locked


def get_all(
    db: Session,
    category_id: int | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    size: str | None = None,
    color: str | None = None,
    recommended_only: bool = False,
    sort: str | None = None,
) -> list[Product]:
    query = db.query(Product).filter(Product.is_active == True, Product.is_archived == False)
    if recommended_only:
        query = query.filter(Product.is_recommended == True)
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)
    if search:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Product.title_ru.ilike(f"%{search}%"),
                Product.title_tj.ilike(f"%{search}%"),
                Product.catalog_number.ilike(f"%{search}%"),
            )
        )
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if size or color:
        query = query.join(ProductVariant)
        if size:
            query = query.filter(ProductVariant.size == size)
        if color:
            from sqlalchemy import func
            normalized = color.strip().lower().replace("ё", "е")
            query = query.filter(
                func.lower(func.replace(ProductVariant.color, "ё", "е")) == normalized
            )
        query = query.distinct()
    if sort == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort == "newest":
        query = query.order_by(Product.created_at.desc())
    elif sort == "rating":
        query = query.order_by(Product.avg_rating.desc().nullslast())
    elif sort == "discount":
        query = query.order_by(Product.discount_percent.desc().nullslast())
    elif sort == "popularity":
        from sqlalchemy import func
        from app.models.order import Order, OrderItem, OrderStatus

        sold_subq = (
            db.query(
                ProductVariant.product_id.label("pid"),
                func.coalesce(func.sum(OrderItem.quantity - OrderItem.returned_quantity), 0).label("sold"),
            )
            .join(OrderItem, OrderItem.product_variant_id == ProductVariant.id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.RETURNED]))
            .group_by(ProductVariant.product_id)
            .subquery()
        )
        query = query.outerjoin(sold_subq, sold_subq.c.pid == Product.id)
        query = query.order_by(func.coalesce(sold_subq.c.sold, 0).desc())

    return query.all()


def get_by_id(db: Session, product_id: int) -> Product | None:
    return db.query(Product).filter(Product.id == product_id).first()


def get_filter_options(db: Session, category_id: int | None = None) -> dict:
    """Реальные размеры и цвета, встречающиеся в каталоге (опционально в пределах
    одной категории) — используется для построения фильтров вместо жёстко
    заданного списка S/M/L/XL."""
    from app.services.color_map import get_color_hex

    query = (
        db.query(ProductVariant.size, ProductVariant.color)
        .join(Product, Product.id == ProductVariant.product_id)
        .filter(Product.is_active == True, Product.is_archived == False)
        .distinct()
    )
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    sizes = set()
    colors_seen = {}
    for size, color in query.all():
        if size:
            sizes.add(size)
        if color:
            normalized = color.strip().lower().replace("ё", "е")
            if normalized not in colors_seen:
                colors_seen[normalized] = color

    return {
        "sizes": sorted(sizes),
        "colors": [
            {"name": name, "hex": get_color_hex(name)}
            for name in sorted(colors_seen.values())
        ],
    }


def update(db: Session, product: Product, data: ProductCreate) -> Product:
    product_data = data.model_dump(exclude={"variants", "catalog_number"})
    if not product_data.get("title_tj"):
        product_data["title_tj"] = translate_to_tj(product_data.get("title_ru"))
    if not product_data.get("description_tj"):
        product_data["description_tj"] = translate_to_tj(product_data.get("description_ru"))
    if not product_data.get("material_tj"):
        product_data["material_tj"] = translate_to_tj(product_data.get("material_ru"))
    if not product_data.get("country_of_origin_tj"):
        product_data["country_of_origin_tj"] = translate_to_tj(product_data.get("country_of_origin_ru"))
    if not product_data.get("care_instructions_tj"):
        product_data["care_instructions_tj"] = translate_to_tj(product_data.get("care_instructions_ru"))
    if not product_data.get("season_tj"):
        product_data["season_tj"] = translate_to_tj(product_data.get("season_ru"))
    if not product_data.get("pattern_tj"):
        product_data["pattern_tj"] = translate_to_tj(product_data.get("pattern_ru"))

    for key, value in product_data.items():
        setattr(product, key, value)

    existing_by_key = {(v.size, v.color): v for v in product.variants}
    incoming_keys = {(v.size, v.color) for v in data.variants}
    existing_suffixes = []
    for v in product.variants:
        if v.sku and v.sku.startswith(f"{product.catalog_number}-"):
            suffix = v.sku[len(f"{product.catalog_number}-"):]
            if suffix.isdigit():
                existing_suffixes.append(int(suffix))
    next_idx = max(existing_suffixes, default=0) + 1

    for variant in data.variants:
        key = (variant.size, variant.color)
        existing = existing_by_key.get(key)
        if existing:
            existing = get_variant_locked(db, existing.id)
            delta = variant.stock - existing.stock
            if delta != 0:
                record_movement(
                    db,
                    variant_id=existing.id,
                    movement_type="incoming" if delta > 0 else "adjustment",
                    quantity=delta,
                    cost_price_at_time=product.cost_price if delta > 0 else None,
                    supplier_id=product.supplier_id if delta > 0 else None,
                    note=f"Изменение остатка через форму товара" if delta > 0 else "Ручная корректировка остатка",
                )
            existing.stock = variant.stock
        else:
            generated_sku = f"{product.catalog_number}-{next_idx}"
            next_idx += 1
            new_variant = ProductVariant(
                product_id=product.id,
                sku=generated_sku,
                size=variant.size,
                color=variant.color,
                stock=variant.stock,
            )
            db.add(new_variant)
            if variant.stock > 0:
                db.flush()
                record_movement(
                    db,
                    variant_id=new_variant.id,
                    movement_type="incoming",
                    quantity=variant.stock,
                    cost_price_at_time=product.cost_price,
                    supplier_id=product.supplier_id,
                    note="Новый вариант добавлен через форму товара",
                )

    for key, existing in existing_by_key.items():
        if key not in incoming_keys:
            existing = get_variant_locked(db, existing.id)
            if existing.stock != 0:
                removed_qty = existing.stock
                record_movement(
                    db,
                    variant_id=existing.id,
                    movement_type="writeoff",
                    quantity=-removed_qty,
                    cost_price_at_time=existing.product.cost_price,
                    note="Вариант удалён из формы товара",
                )
                existing.stock = 0

    db.commit()
    db.refresh(product)
    return product


def create(db: Session, data: ProductCreate) -> Product:
    variants_data = data.variants
    base_product_data = data.model_dump(exclude={"variants", "catalog_number"})

    # Переводы не зависят от catalog_number — считаем один раз, вне цикла повторов
    if not base_product_data.get("title_tj"):
        base_product_data["title_tj"] = translate_to_tj(base_product_data.get("title_ru"))
    if not base_product_data.get("description_tj"):
        base_product_data["description_tj"] = translate_to_tj(base_product_data.get("description_ru"))
    if not base_product_data.get("material_tj"):
        base_product_data["material_tj"] = translate_to_tj(base_product_data.get("material_ru"))
    if not base_product_data.get("country_of_origin_tj"):
        base_product_data["country_of_origin_tj"] = translate_to_tj(base_product_data.get("country_of_origin_ru"))
    if not base_product_data.get("care_instructions_tj"):
        base_product_data["care_instructions_tj"] = translate_to_tj(base_product_data.get("care_instructions_ru"))
    if not base_product_data.get("season_tj"):
        base_product_data["season_tj"] = translate_to_tj(base_product_data.get("season_ru"))
    if not base_product_data.get("pattern_tj"):
        base_product_data["pattern_tj"] = translate_to_tj(base_product_data.get("pattern_ru"))

    max_retries = 3
    for attempt in range(max_retries):
        product_data = dict(base_product_data)
        all_numbers = [row[0] for row in db.query(Product.catalog_number).all()]
        numeric_numbers = [int(n) for n in all_numbers if n and n.isdigit()]
        next_number = max(numeric_numbers, default=0) + 1
        product_data["catalog_number"] = f"{next_number:03d}"

        product = Product(**product_data)
        db.add(product)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            if attempt == max_retries - 1:
                raise
            continue

        for idx, variant in enumerate(variants_data, start=1):
            variant_data = variant.model_dump(exclude={"sku"})
            generated_sku = f"{product.catalog_number}-{idx}"
            new_variant = ProductVariant(product_id=product.id, sku=generated_sku, **variant_data)
            db.add(new_variant)
            if variant_data.get("stock", 0) > 0:
                db.flush()
                record_movement(
                    db,
                    variant_id=new_variant.id,
                    movement_type="incoming",
                    quantity=variant_data["stock"],
                    cost_price_at_time=product.cost_price,
                    supplier_id=product.supplier_id,
                    note="Начальный остаток при создании товара",
                )

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if attempt == max_retries - 1:
                raise
            continue

        db.refresh(product)
        return product