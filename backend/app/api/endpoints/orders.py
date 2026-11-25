from typing import List, Dict, Any, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.user import User
from app.schemas.order import (
    OrderCreate, OrderResponse, OrderStatusUpdate
)
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth
from app.services.order_service import create_order_in_db

router = APIRouter(prefix="/orders", tags=["Pedidos & Checkout"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def checkout_create_order(
    payload: OrderCreate,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Cria um novo pedido com cálculo estrito no backend (atacado progressivo e frete).
    Gera status 'pending_payment' e código Pix instantâneo.
    """
    tenant_id = tenant_dict["id"]
    order = await create_order_in_db(db, tenant_id, payload)
    return OrderResponse.model_validate(order)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: UUID,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Consulta um pedido por ID ou número garantindo o tenant_id.
    """
    tenant_id = tenant_dict["id"]
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    return OrderResponse.model_validate(order)


@router.get("", response_model=List[OrderResponse])
async def list_tenant_orders(
    status_filter: Optional[str] = None,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista todos os pedidos da loja para o painel do lojista.
    """
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.tenant_id == tenant_id)
        .order_by(desc(Order.created_at))
    )

    if status_filter:
        stmt = stmt.where(Order.status == status_filter)

    res = await db.execute(stmt)
    orders = res.scalars().all()
    return [OrderResponse.model_validate(o) for o in orders]


@router.put("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Atualiza o status de produção ou pagamento de um pedido.
    """
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    res = await db.execute(stmt)
    order = res.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    order.status = payload.status
    if payload.status in ["payment_confirmed", "paid"]:
        order.payment_status = "paid"

    await db.commit()
    await db.refresh(order)
    return OrderResponse.model_validate(order)
