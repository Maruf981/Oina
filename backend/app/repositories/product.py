from sqlalchemy.orm import Session
from app.models.product import Product, ProductVariant
from app.schemas.product import ProductCreate
from app.services.translate import translate_to_tj
from app.repositories.stock_movement import record_movement


def get_all(
    db: Session,
    category_id: int | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    size: str | None = None,
    color: str | None = None,
) -> list[Product]:
    query = db.query(Product).filter(Product.is_active == True)
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
            query = query.filter(ProductVariant.color == color)
        query = query.distinct()
    return query.all()


def get_by_id(db: Session, product_id: int) -> Product | None:
    return db.query(Product).filter(Product.id == product_id).first()


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

    from app.models.order import OrderItem

    existing_by_key = {(v.size, v.color): v for v in product.variants}
    incoming_keys = {(v.size, v.color) for v in data.variants}
    next_idx = len(existing_by_key) + 1

    for variant in data.variants:
        key = (variant.size, variant.color)
        existing = existing_by_key.get(key)
        if existing:
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
            has_orders = db.query(OrderItem).filter(
                OrderItem.product_variant_id == existing.id
            ).first() is not None
            if has_orders:
                existing.stock = 0
            else:
                db.delete(existing)

    db.commit()
    db.refresh(product)
    return product


def create(db: Session, data: ProductCreate) -> Product:
    variants_data = data.variants
    product_data = data.model_dump(exclude={"variants", "catalog_number"})

    next_number = db.query(Product).count() + 1
    product_data["catalog_number"] = f"{next_number:03d}"

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

    product = Product(**product_data)
    db.add(product)
    db.flush()
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
    db.commit()
    db.refresh(product)
    return product