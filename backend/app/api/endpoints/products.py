from typing import List, Dict, Any, Optional
from uuid import UUID
import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.product import Product, ProductVariant, ProductWholesaleTier, ProductCustomizationField
from app.models.category import Category
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductQuickUpdate,
    ProductResponse,
)
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth

router = APIRouter(prefix="/products", tags=["Produtos"])


def _verify_tenant_access(user: User, tenant_id: Any):
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado a esta loja.")


async def _validate_category_ownership(db: AsyncSession, tenant_id: Any, category_id: Optional[UUID]):
    if not category_id:
        return
    stmt = select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
    if not (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Categoria inválida ou pertencente a outra loja.",
        )


def _normalize_images(image_url: Optional[str], images_json: Optional[List[str]]) -> tuple[Optional[str], List[str]]:
    imgs = [u.strip() for u in (images_json or []) if u and u.strip()]
    if imgs:
        return imgs[0], imgs
    if image_url and image_url.strip():
        return image_url.strip(), [image_url.strip()]
    return None, []


def _sync_status_flags(status_val: Optional[str], is_active_val: Optional[bool]) -> tuple[str, bool]:
    if status_val is not None:
        clean = status_val.strip().upper()
        if clean not in ("ACTIVE", "DRAFT"):
            clean = "ACTIVE"
        return clean, (clean == "ACTIVE")
    if is_active_val is not None:
        return ("ACTIVE" if is_active_val else "DRAFT"), bool(is_active_val)
    return "ACTIVE", True


async def _load_product_full(db: AsyncSession, product_id: Any, tenant_id: Any) -> Product:
    res = await db.execute(
        select(Product)
        .options(
            selectinload(Product.wholesale_tiers),
            selectinload(Product.variants),
            selectinload(Product.customization_fields),
        )
        .where(Product.id == product_id, Product.tenant_id == tenant_id)
    )
    return res.scalar_one()


@router.get("", response_model=List[ProductResponse])
async def list_products(
    category_slug: Optional[str] = None,
    featured: Optional[bool] = None,
    search: Optional[str] = None,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Lista os produtos ativos da loja na vitrine pública."""
    tenant_id = tenant_dict["id"]
    stmt = (
        select(Product)
        .options(
            selectinload(Product.wholesale_tiers),
            selectinload(Product.variants),
            selectinload(Product.customization_fields),
        )
        .where(
            Product.tenant_id == tenant_id,
            Product.is_active == True,
            Product.status == "ACTIVE",
        )
    )

    if featured is not None:
        stmt = stmt.where(Product.is_featured == featured)

    if category_slug:
        cat_stmt = select(Category.id).where(Category.tenant_id == tenant_id, Category.slug == category_slug)
        cat_id = (await db.execute(cat_stmt)).scalar_one_or_none()
        if cat_id:
            stmt = stmt.where(Product.category_id == cat_id)

    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            (Product.name.ilike(term))
            | (Product.description.ilike(term))
            | (Product.sku.ilike(term))
        )

    stmt = stmt.order_by(Product.is_featured.desc(), Product.created_at.desc())
    products = (await db.execute(stmt)).scalars().all()
    return [ProductResponse.model_validate(p) for p in products]


@router.get("/admin", response_model=List[ProductResponse])
async def list_admin_products(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos os produtos da loja (Ativos, Rascunhos, Estoque Baixo) para o painel admin."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = (
        select(Product)
        .options(
            selectinload(Product.wholesale_tiers),
            selectinload(Product.variants),
            selectinload(Product.customization_fields),
        )
        .where(Product.tenant_id == tenant_id)
    )

    if status_filter:
        sf = status_filter.strip().upper()
        if sf == "ACTIVE":
            stmt = stmt.where(Product.status == "ACTIVE")
        elif sf == "DRAFT":
            stmt = stmt.where(Product.status == "DRAFT")
        elif sf == "LOW_STOCK":
            stmt = stmt.where(
                Product.track_inventory == True,
                Product.stock_quantity <= Product.low_stock_threshold,
            )

    if category_id:
        stmt = stmt.where(Product.category_id == category_id)

    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where((Product.name.ilike(term)) | (Product.sku.ilike(term)))

    stmt = stmt.order_by(Product.created_at.desc())
    products = (await db.execute(stmt)).scalars().all()
    return [ProductResponse.model_validate(p) for p in products]


@router.get("/admin/{product_id}", response_model=ProductResponse)
async def get_admin_product_detail(
    product_id: UUID,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Retorna detalhes completos de qualquer produto da loja (inclusive rascunhos) para edição."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = (
        select(Product)
        .options(
            selectinload(Product.wholesale_tiers),
            selectinload(Product.variants),
            selectinload(Product.customization_fields),
        )
        .where(Product.id == product_id, Product.tenant_id == tenant_id)
    )
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado nesta loja.")
    return ProductResponse.model_validate(product)


@router.get("/{slug_or_id}", response_model=ProductResponse)
async def get_product_detail(
    slug_or_id: str,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Obtém um produto ativo pelo slug ou id na vitrine pública."""
    tenant_id = tenant_dict["id"]
    stmt = (
        select(Product)
        .options(
            selectinload(Product.wholesale_tiers),
            selectinload(Product.variants),
            selectinload(Product.customization_fields),
        )
        .where(Product.tenant_id == tenant_id, Product.is_active == True)
    )

    try:
        val_uuid = UUID(slug_or_id)
        stmt = stmt.where(Product.id == val_uuid)
    except ValueError:
        stmt = stmt.where(Product.slug == slug_or_id)

    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado nesta loja.")

    return ProductResponse.model_validate(product)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)
    await _validate_category_ownership(db, tenant_id, payload.category_id)

    dup_stmt = select(Product).where(
        Product.tenant_id == tenant_id,
        (Product.slug == payload.slug) | (Product.sku == payload.sku),
    )
    if (await db.execute(dup_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já existe um produto com este slug ou SKU nesta loja.")

    product_data = payload.model_dump(exclude={"wholesale_tiers", "variants", "customization_fields"})
    cover_url, gallery = _normalize_images(product_data.get("image_url"), product_data.get("images_json"))
    status_str, active_bool = _sync_status_flags(product_data.get("status"), product_data.get("is_active"))
    product_data["image_url"] = cover_url
    product_data["images_json"] = gallery
    product_data["status"] = status_str
    product_data["is_active"] = active_bool
    if payload.variants and len(payload.variants) > 0:
        product_data["product_type"] = "variable"

    product = Product(tenant_id=tenant_id, **product_data)
    db.add(product)
    await db.flush()

    if payload.wholesale_tiers:
        for tier_data in payload.wholesale_tiers:
            db.add(ProductWholesaleTier(
                tenant_id=tenant_id,
                product_id=product.id,
                min_quantity=tier_data.min_quantity,
                unit_price=tier_data.unit_price,
            ))

    if payload.variants:
        for var_data in payload.variants:
            v_dict = var_data.model_dump(exclude={"id"})
            db.add(ProductVariant(
                tenant_id=tenant_id,
                product_id=product.id,
                **v_dict,
            ))

    if payload.customization_fields:
        for idx, cf_data in enumerate(payload.customization_fields):
            cf_dict = cf_data.model_dump(exclude={"id"})
            cf_dict["position"] = cf_dict.get("position", idx)
            db.add(ProductCustomizationField(
                tenant_id=tenant_id,
                product_id=product.id,
                **cf_dict,
            ))

    await db.commit()
    full_prod = await _load_product_full(db, product.id, tenant_id)
    return ProductResponse.model_validate(full_prod)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = (
        select(Product)
        .options(
            selectinload(Product.wholesale_tiers),
            selectinload(Product.variants),
            selectinload(Product.customization_fields),
        )
        .where(Product.id == product_id, Product.tenant_id == tenant_id)
    )
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    update_data = payload.model_dump(exclude={"wholesale_tiers", "variants", "customization_fields"}, exclude_unset=True)

    if "category_id" in update_data:
        await _validate_category_ownership(db, tenant_id, update_data["category_id"])

    if "slug" in update_data or "sku" in update_data:
        check_slug = update_data.get("slug", product.slug)
        check_sku = update_data.get("sku", product.sku)
        dup_stmt = select(Product).where(
            Product.tenant_id == tenant_id,
            Product.id != product_id,
            (Product.slug == check_slug) | (Product.sku == check_sku),
        )
        if (await db.execute(dup_stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Já existe outro produto com este slug ou SKU nesta loja.")

    if "images_json" in update_data or "image_url" in update_data:
        raw_img = update_data.get("image_url", product.image_url)
        raw_gal = update_data.get("images_json", product.images_json)
        cover_url, gallery = _normalize_images(raw_img, raw_gal)
        update_data["image_url"] = cover_url
        update_data["images_json"] = gallery

    if "status" in update_data or "is_active" in update_data:
        status_str, active_bool = _sync_status_flags(
            update_data.get("status"), update_data.get("is_active")
        )
        update_data["status"] = status_str
        update_data["is_active"] = active_bool

    for key, value in update_data.items():
        setattr(product, key, value)

    if payload.wholesale_tiers is not None:
        del_res = await db.execute(
            select(ProductWholesaleTier).where(
                ProductWholesaleTier.product_id == product.id,
                ProductWholesaleTier.tenant_id == tenant_id,
            )
        )
        for old_tier in del_res.scalars().all():
            await db.delete(old_tier)

        for tier_data in payload.wholesale_tiers:
            db.add(ProductWholesaleTier(
                tenant_id=tenant_id,
                product_id=product.id,
                min_quantity=tier_data.min_quantity,
                unit_price=tier_data.unit_price,
            ))

    if payload.variants is not None:
        del_var_res = await db.execute(
            select(ProductVariant).where(
                ProductVariant.product_id == product.id,
                ProductVariant.tenant_id == tenant_id,
            )
        )
        for old_var in del_var_res.scalars().all():
            await db.delete(old_var)
        await db.flush()

        for var_data in payload.variants:
            v_dict = var_data.model_dump(exclude={"id"})
            db.add(ProductVariant(
                tenant_id=tenant_id,
                product_id=product.id,
                **v_dict,
            ))
        product.product_type = "variable" if len(payload.variants) > 0 else "simple"

    if payload.customization_fields is not None:
        del_cf_res = await db.execute(
            select(ProductCustomizationField).where(
                ProductCustomizationField.product_id == product.id,
                ProductCustomizationField.tenant_id == tenant_id,
            )
        )
        for old_cf in del_cf_res.scalars().all():
            await db.delete(old_cf)
        await db.flush()

        for idx, cf_data in enumerate(payload.customization_fields):
            cf_dict = cf_data.model_dump(exclude={"id"})
            cf_dict["position"] = idx
            db.add(ProductCustomizationField(
                tenant_id=tenant_id,
                product_id=product.id,
                **cf_dict,
            ))

    await db.commit()
    full_prod = await _load_product_full(db, product.id, tenant_id)
    return ProductResponse.model_validate(full_prod)


@router.patch("/{product_id}/quick", response_model=ProductResponse)
async def quick_update_product(
    product_id: UUID,
    payload: ProductQuickUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Edição rápida inline na listagem de produtos (preço, estoque, categoria e status)."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data:
        await _validate_category_ownership(db, tenant_id, data["category_id"])

    if "status" in data or "is_active" in data:
        status_str, active_bool = _sync_status_flags(data.get("status"), data.get("is_active"))
        data["status"] = status_str
        data["is_active"] = active_bool

    for key, val in data.items():
        setattr(product, key, val)

    await db.commit()
    full_prod = await _load_product_full(db, product.id, tenant_id)
    return ProductResponse.model_validate(full_prod)


@router.post("/{product_id}/duplicate", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_product(
    product_id: UUID,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Duplica um produto completo (com variações e atacado) dentro da mesma loja."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    src = await _load_product_full(db, product_id, tenant_id)
    if not src:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    suffix = uuid_lib.uuid4().hex[:5]
    new_slug = f"{src.slug[:230]}-copia-{suffix}"
    new_sku = f"{src.sku[:85]}-{suffix.upper()}"

    clone = Product(
        tenant_id=tenant_id,
        category_id=src.category_id,
        name=f"{src.name} (Cópia)",
        slug=new_slug,
        sku=new_sku,
        product_type=src.product_type,
        description=src.description,
        short_description=src.short_description,
        base_price=src.base_price,
        compare_at_price=src.compare_at_price,
        cost_price=src.cost_price,
        image_url=src.image_url,
        images_json=list(src.images_json or ([src.image_url] if src.image_url else [])),
        status="DRAFT",
        is_active=False,
        is_featured=False,
        badge_label=src.badge_label,
        track_inventory=src.track_inventory,
        stock_quantity=src.stock_quantity,
        low_stock_threshold=src.low_stock_threshold,
        allow_backorder=src.allow_backorder,
        is_physical=src.is_physical,
        weight_grams=src.weight_grams,
        length_cm=src.length_cm,
        width_cm=src.width_cm,
        height_cm=src.height_cm,
        enable_text_customization=src.enable_text_customization,
        text_customization_label=src.text_customization_label,
        text_max_length=src.text_max_length,
        enable_artwork_upload=src.enable_artwork_upload,
        upload_max_size_mb=src.upload_max_size_mb,
        allowed_upload_formats=list(src.allowed_upload_formats or ["png", "jpg", "jpeg", "svg", "pdf"]),
        production_lead_time_days=src.production_lead_time_days,
        seo_title=src.seo_title,
        seo_description=src.seo_description,
    )
    db.add(clone)
    await db.flush()

    for tier in src.wholesale_tiers:
        db.add(ProductWholesaleTier(
            tenant_id=tenant_id,
            product_id=clone.id,
            min_quantity=tier.min_quantity,
            unit_price=tier.unit_price,
        ))

    for var in src.variants:
        db.add(ProductVariant(
            tenant_id=tenant_id,
            product_id=clone.id,
            sku=f"{var.sku[:85]}-{suffix.upper()}",
            name=var.name,
            attribute_options=dict(var.attribute_options or {}),
            price_modifier=var.price_modifier,
            final_price=var.final_price,
            stock_quantity=var.stock_quantity,
            weight_grams=var.weight_grams,
            image_url=var.image_url,
            is_active=var.is_active,
        ))

    await db.commit()
    full_clone = await _load_product_full(db, clone.id, tenant_id)
    return ProductResponse.model_validate(full_clone)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    await db.delete(product)
    await db.commit()
    return None
