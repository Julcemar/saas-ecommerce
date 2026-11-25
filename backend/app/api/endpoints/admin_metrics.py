from typing import Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.order import Order
from app.models.product import Product
from app.models.user import User
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth

router = APIRouter(prefix="/admin", tags=["Admin Metrics"])


@router.get("/metrics")
async def get_dashboard_metrics(
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna métricas consolidadas de vendas para o Dashboard do lojista:
    - GMV (Volume bruto faturado)
    - Total de pedidos
    - Ticket médio
    - Contagem de pedidos por status (Kanban)
    - Total de produtos ativos
    """
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    # GMV e total de pedidos
    total_orders_stmt = select(func.count(Order.id)).where(Order.tenant_id == tenant_id)
    total_orders_res = await db.execute(total_orders_stmt)
    total_orders = total_orders_res.scalar() or 0

    gmv_stmt = select(func.sum(Order.total_amount)).where(
        Order.tenant_id == tenant_id,
        Order.status != "cancelled"
    )
    gmv_res = await db.execute(gmv_stmt)
    total_gmv = Decimal(str(gmv_res.scalar() or 0))

    ticket_medio = total_gmv / total_orders if total_orders > 0 else Decimal("0.00")

    # Contagem por status
    status_counts_stmt = (
        select(Order.status, func.count(Order.id))
        .where(Order.tenant_id == tenant_id)
        .group_by(Order.status)
    )
    status_res = await db.execute(status_counts_stmt)
    orders_by_status = dict(status_res.all())

    # Total de produtos
    prod_stmt = select(func.count(Product.id)).where(Product.tenant_id == tenant_id, Product.is_active == True)
    prod_res = await db.execute(prod_stmt)
    total_products = prod_res.scalar() or 0

    return {
        "gmv": float(total_gmv),
        "total_orders": total_orders,
        "average_ticket": float(round(ticket_medio, 2)),
        "total_products": total_products,
        "orders_by_status": {
            "pending_payment": orders_by_status.get("pending_payment", 0),
            "payment_confirmed": orders_by_status.get("payment_confirmed", 0),
            "artwork_review": orders_by_status.get("artwork_review", 0),
            "in_production": orders_by_status.get("in_production", 0),
            "ready_for_dispatch": orders_by_status.get("ready_for_dispatch", 0),
            "shipped": orders_by_status.get("shipped", 0),
            "delivered": orders_by_status.get("delivered", 0),
            "cancelled": orders_by_status.get("cancelled", 0),
        }
    }
