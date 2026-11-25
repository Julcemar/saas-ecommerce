from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth

router = APIRouter(prefix="/categories", tags=["Categorias"])


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista todas as categorias ativas do tenant atual.
    """
    tenant_id = tenant_dict["id"]
    stmt = (
        select(Category)
        .where(Category.tenant_id == tenant_id, Category.is_active == True)
        .order_by(Category.display_order, Category.name)
    )
    res = await db.execute(stmt)
    categories = res.scalars().all()

    # Conta produtos por categoria dentro do tenant
    result_list = []
    for cat in categories:
        count_stmt = select(func.count(Product.id)).where(
            Product.category_id == cat.id,
            Product.tenant_id == tenant_id,
            Product.is_active == True
        )
        count_res = await db.execute(count_stmt)
        count = count_res.scalar() or 0

        cat_resp = CategoryResponse.model_validate(cat)
        cat_resp.products_count = count
        result_list.append(cat_resp)

    return result_list


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    # Verifica se já existe o slug na mesma loja
    exist_stmt = select(Category).where(Category.tenant_id == tenant_id, Category.slug == payload.slug)
    exist_res = await db.execute(exist_stmt)
    if exist_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Já existe uma categoria com este slug nesta loja.")

    category = Category(
        tenant_id=tenant_id,
        **payload.model_dump()
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    resp = CategoryResponse.model_validate(category)
    resp.products_count = 0
    return resp


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    stmt = select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
    res = await db.execute(stmt)
    category = res.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)
    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    stmt = select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
    res = await db.execute(stmt)
    category = res.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    await db.delete(category)
    await db.commit()
    return None
