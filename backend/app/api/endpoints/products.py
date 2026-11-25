from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.product import Product, ProductWholesaleTier
from app.models.user import User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse
)
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth

router = APIRouter(prefix="/products", tags=["Produtos"])


@router.get("", response_model=List[ProductResponse])
async def list_products(
    category_slug: Optional[str] = None,
    featured: Optional[bool] = None,
    search: Optional[str] = None,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista os produtos da loja do tenant com suporte a filtros.
    """
    tenant_id = tenant_dict["id"]
    stmt = (
        select(Product)
        .options(selectinload(Product.wholesale_tiers))
        .where(Product.tenant_id == tenant_id, Product.is_active == True)
    )

    if featured is not None:
        stmt = stmt.where(Product.is_featured == featured)

    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where((Product.name.ilike(term)) | (Product.description.ilike(term)))

    stmt = stmt.order_by(Product.is_featured.desc(), Product.created_at.desc())
    res = await db.execute(stmt)
    products = res.scalars().all()
    return [ProductResponse.model_validate(p) for p in products]


@router.get("/{slug_or_id}", response_model=ProductResponse)
async def get_product_detail(
    slug_or_id: str,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtém um produto pelo slug ou id garantindo o isolamento do tenant.
    """
    tenant_id = tenant_dict["id"]
    stmt = (
        select(Product)
        .options(selectinload(Product.wholesale_tiers))
        .where(Product.tenant_id == tenant_id, Product.is_active == True)
    )

    # Verifica se é UUID ou slug
    try:
        val_uuid = UUID(slug_or_id)
        stmt = stmt.where(Product.id == val_uuid)
    except ValueError:
        stmt = stmt.where(Product.slug == slug_or_id)

    res = await db.execute(stmt)
    product = res.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado nesta loja.")

    return ProductResponse.model_validate(product)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    # Verifica duplicidade de slug ou SKU dentro da loja
    dup_stmt = select(Product).where(
        Product.tenant_id == tenant_id,
        (Product.slug == payload.slug) | (Product.sku == payload.sku)
    )
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já existe um produto com este slug ou SKU nesta loja.")

    product_data = payload.model_dump(exclude={"wholesale_tiers"})
    product = Product(tenant_id=tenant_id, **product_data)
    db.add(product)
    await db.flush()

    # Adiciona faixas de atacado progressivo
    if payload.wholesale_tiers:
        for tier_data in payload.wholesale_tiers:
            tier = ProductWholesaleTier(
                tenant_id=tenant_id,
                product_id=product.id,
                min_quantity=tier_data.min_quantity,
                unit_price=tier_data.unit_price
            )
            db.add(tier)

    await db.commit()
    await db.refresh(product)

    # Recarrega com faixas
    res = await db.execute(
        select(Product).options(selectinload(Product.wholesale_tiers)).where(Product.id == product.id)
    )
    product_with_tiers = res.scalar_one()
    return ProductResponse.model_validate(product_with_tiers)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    stmt = (
        select(Product)
        .options(selectinload(Product.wholesale_tiers))
        .where(Product.id == product_id, Product.tenant_id == tenant_id)
    )
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    update_data = payload.model_dump(exclude={"wholesale_tiers"}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    # Se enviou wholesale_tiers, substitui as faixas
    if payload.wholesale_tiers is not None:
        # Remove faixas anteriores
        del_stmt = select(ProductWholesaleTier).where(
            ProductWholesaleTier.product_id == product.id,
            ProductWholesaleTier.tenant_id == tenant_id
        )
        del_res = await db.execute(del_stmt)
        for old_tier in del_res.scalars().all():
            await db.delete(old_tier)

        for tier_data in payload.wholesale_tiers:
            new_tier = ProductWholesaleTier(
                tenant_id=tenant_id,
                product_id=product.id,
                min_quantity=tier_data.min_quantity,
                unit_price=tier_data.unit_price
            )
            db.add(new_tier)

    await db.commit()
    await db.refresh(product)

    # Recarrega atualizado
    res = await db.execute(
        select(Product).options(selectinload(Product.wholesale_tiers)).where(Product.id == product.id)
    )
    return ProductResponse.model_validate(res.scalar_one())


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    stmt = select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    await db.delete(product)
    await db.commit()
    return None
