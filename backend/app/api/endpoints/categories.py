from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryReorderItem,
)
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth

router = APIRouter(prefix="/categories", tags=["Categorias"])


def _verify_tenant_access(user: User, tenant_id: Any):
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado a esta loja.")


async def _validate_parent_category(
    db: AsyncSession,
    tenant_id: Any,
    parent_id: Optional[UUID],
    self_id: Optional[UUID] = None,
):
    if not parent_id:
        return
    if self_id and str(parent_id) == str(self_id):
        raise HTTPException(status_code=400, detail="Uma categoria não pode ser pai de si mesma.")
    stmt = select(Category).where(Category.id == parent_id, Category.tenant_id == tenant_id)
    res = await db.execute(stmt)
    if not res.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Categoria pai não encontrada ou pertence a outra loja.",
        )


async def _attach_product_counts(
    db: AsyncSession, tenant_id: Any, categories: List[Category], only_active_products: bool = True
) -> List[CategoryResponse]:
    count_stmt = (
        select(Product.category_id, func.count(Product.id))
        .where(Product.tenant_id == tenant_id, Product.category_id.isnot(None))
    )
    if only_active_products:
        count_stmt = count_stmt.where(Product.is_active == True)
    count_stmt = count_stmt.group_by(Product.category_id)
    count_res = await db.execute(count_stmt)
    counts_map = {str(cid): cnt for cid, cnt in count_res.all()}

    result_list = []
    for cat in categories:
        cat_resp = CategoryResponse.model_validate(cat)
        cat_resp.products_count = counts_map.get(str(cat.id), 0)
        result_list.append(cat_resp)
    return result_list


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Lista todas as categorias ativas/visíveis da loja atual (vitrine)."""
    tenant_id = tenant_dict["id"]
    stmt = (
        select(Category)
        .where(Category.tenant_id == tenant_id, Category.is_active == True)
        .order_by(Category.display_order, Category.name)
    )
    categories = (await db.execute(stmt)).scalars().all()
    return await _attach_product_counts(db, tenant_id, categories, only_active_products=True)


@router.get("/admin", response_model=List[CategoryResponse])
async def list_admin_categories(
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Lista todas as categorias e subcategorias da loja (ativas e ocultas) para o painel admin."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = (
        select(Category)
        .where(Category.tenant_id == tenant_id)
        .order_by(Category.display_order, Category.name)
    )
    categories = (await db.execute(stmt)).scalars().all()
    return await _attach_product_counts(db, tenant_id, categories, only_active_products=False)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    exist_stmt = select(Category).where(Category.tenant_id == tenant_id, Category.slug == payload.slug)
    if (await db.execute(exist_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já existe uma categoria com este slug nesta loja.")

    await _validate_parent_category(db, tenant_id, payload.parent_id)

    category = Category(tenant_id=tenant_id, **payload.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)

    resp = CategoryResponse.model_validate(category)
    resp.products_count = 0
    return resp


@router.patch("/reorder")
async def reorder_categories(
    items: List[CategoryReorderItem],
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Reordena categorias/subcategorias dentro do mesmo tenant."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    for item in items:
        stmt = select(Category).where(Category.id == item.id, Category.tenant_id == tenant_id)
        cat = (await db.execute(stmt)).scalar_one_or_none()
        if not cat:
            continue
        if item.parent_id:
            await _validate_parent_category(db, tenant_id, item.parent_id, self_id=cat.id)
        cat.display_order = item.display_order
        cat.parent_id = item.parent_id

    await db.commit()
    return {"status": "ok", "updated": len(items)}


@router.put("/{category_id}", response_model=CategoryResponse)
@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
    category = (await db.execute(stmt)).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    update_data = payload.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] != category.slug:
        dup = await db.execute(
            select(Category).where(
                Category.tenant_id == tenant_id,
                Category.slug == update_data["slug"],
                Category.id != category_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Já existe outra categoria com este slug nesta loja.")

    if "parent_id" in update_data:
        await _validate_parent_category(db, tenant_id, update_data["parent_id"], self_id=category_id)

    for key, value in update_data.items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)

    enriched = await _attach_product_counts(db, tenant_id, [category], only_active_products=False)
    return enriched[0]


@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
async def delete_category(
    category_id: UUID,
    reallocate_to: Optional[UUID] = Query(None, description="ID da categoria destino para realocar produtos"),
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
    category = (await db.execute(stmt)).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    prod_count = (
        await db.execute(
            select(func.count(Product.id)).where(
                Product.tenant_id == tenant_id, Product.category_id == category_id
            )
        )
    ).scalar() or 0

    child_count = (
        await db.execute(
            select(func.count(Category.id)).where(
                Category.tenant_id == tenant_id, Category.parent_id == category_id
            )
        )
    ).scalar() or 0

    if prod_count > 0:
        if not reallocate_to:
            raise HTTPException(
                status_code=400,
                detail=f"Existem {prod_count} produto(s) vinculados a esta categoria. Selecione uma categoria de destino para realocá-los antes de excluir.",
            )
        if str(reallocate_to) == str(category_id):
            raise HTTPException(status_code=400, detail="Selecione uma categoria de destino diferente.")
        dest = (
            await db.execute(
                select(Category).where(Category.id == reallocate_to, Category.tenant_id == tenant_id)
            )
        ).scalar_one_or_none()
        if not dest:
            raise HTTPException(status_code=400, detail="Categoria de destino não encontrada nesta loja.")

        await db.execute(
            update(Product)
            .where(Product.tenant_id == tenant_id, Product.category_id == category_id)
            .values(category_id=reallocate_to)
        )

    if child_count > 0:
        # Promove subcategorias ou move para a categoria destino
        await db.execute(
            update(Category)
            .where(Category.tenant_id == tenant_id, Category.parent_id == category_id)
            .values(parent_id=reallocate_to)
        )

    await db.delete(category)
    await db.commit()
    return {"status": "deleted", "reallocated_products": prod_count}
