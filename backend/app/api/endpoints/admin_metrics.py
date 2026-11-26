from typing import Dict, Any, List
from decimal import Decimal
from datetime import datetime, timedelta, date, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth

router = APIRouter(prefix="/admin", tags=["Admin Metrics"])


def _get_period_bounds(period: str) -> tuple[datetime, datetime, datetime]:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if period == "today":
        start = today_start
        prev_start = start - timedelta(days=1)
    elif period == "7d":
        start = today_start - timedelta(days=6)
        prev_start = start - timedelta(days=7)
    elif period == "month":
        start = today_start.replace(day=1)
        prev_month_end = start - timedelta(days=1)
        prev_start = prev_month_end.replace(day=1)
    else:  # 30d default
        start = today_start - timedelta(days=29)
        prev_start = start - timedelta(days=30)

    return start, now, prev_start


def _is_paid(o: Order) -> bool:
    ps = (o.payment_status or "").upper()
    st = (o.status or "").lower()
    return ps == "PAID" or st in ("payment_confirmed", "paid", "in_production", "ready_for_dispatch", "shipped", "delivered")


@router.get("/metrics")
async def get_dashboard_metrics(
    period: str = Query("30d", description="today, 7d, 30d, month"),
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Retorna KPIs executivos, comparativo de período, alertas operacionais, série de vendas e rankings."""
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    start_dt, end_dt, prev_start_dt = _get_period_bounds(period)

    all_orders = (
        await db.execute(
            select(Order)
            .where(Order.tenant_id == tenant_id)
            .order_by(desc(Order.created_at))
        )
    ).scalars().all()

    def _to_utc(dt: datetime) -> datetime:
        return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)

    current_orders = [o for o in all_orders if start_dt <= _to_utc(o.created_at) <= end_dt]
    prev_orders = [o for o in all_orders if prev_start_dt <= _to_utc(o.created_at) < start_dt]

    paid_current = [o for o in current_orders if _is_paid(o) and (o.status or "").lower() != "cancelled"]
    paid_prev = [o for o in prev_orders if _is_paid(o) and (o.status or "").lower() != "cancelled"]

    approved_revenue = sum((Decimal(str(o.total_amount or 0)) for o in paid_current), Decimal("0.00"))
    prev_revenue = sum((Decimal(str(o.total_amount or 0)) for o in paid_prev), Decimal("0.00"))

    if prev_revenue > 0:
        revenue_growth_pct = float(((approved_revenue - prev_revenue) / prev_revenue) * 100)
    elif approved_revenue > 0:
        revenue_growth_pct = 100.0
    else:
        revenue_growth_pct = 0.0

    paid_count = len(paid_current)
    avg_ticket = float(approved_revenue / paid_count) if paid_count > 0 else 0.0

    in_production_now = sum(
        1
        for o in all_orders
        if (o.production_status or "NEW") in ("NEW", "ART_APPROVAL", "IN_PRODUCTION", "QUALITY_PACKING", "READY_TO_SHIP")
        and (o.status or "").lower() != "cancelled"
    )

    # Alertas da Central de Atenção
    today_date = date.today()
    pending_art_orders = sum(
        1 for o in all_orders if (o.production_status or "NEW") == "ART_APPROVAL"
    )
    critical_deadline_orders = sum(
        1
        for o in all_orders
        if (o.production_status or "NEW") != "SHIPPED"
        and o.due_date is not None
        and o.due_date <= today_date
    )
    low_stock_products = (
        await db.execute(
            select(func.count(Product.id)).where(
                Product.tenant_id == tenant_id,
                Product.track_inventory == True,
                Product.stock_quantity <= Product.low_stock_threshold,
            )
        )
    ).scalar() or 0

    # Série diária para o gráfico
    day_buckets: Dict[str, Dict[str, Any]] = {}
    cur_day = start_dt.date()
    end_day = end_dt.date()
    while cur_day <= end_day:
        key = cur_day.isoformat()
        day_buckets[key] = {
            "date": key,
            "label": cur_day.strftime("%d/%m"),
            "revenue": 0.0,
            "orders": 0,
        }
        cur_day += timedelta(days=1)

    for o in paid_current:
        d_key = _to_utc(o.created_at).date().isoformat()
        if d_key in day_buckets:
            day_buckets[d_key]["revenue"] += float(o.total_amount or 0)
            day_buckets[d_key]["orders"] += 1

    # Top 5 Produtos Mais Vendidos no período (ou geral do tenant)
    period_order_ids = [o.id for o in paid_current] or [o.id for o in all_orders]
    top_products: List[Dict[str, Any]] = []
    if period_order_ids:
        items_rows = (
            await db.execute(
                select(
                    OrderItem.name,
                    OrderItem.sku,
                    func.sum(OrderItem.quantity).label("qty_sold"),
                    func.sum(OrderItem.subtotal).label("revenue"),
                )
                .where(OrderItem.tenant_id == tenant_id, OrderItem.order_id.in_(period_order_ids))
                .group_by(OrderItem.name, OrderItem.sku)
                .order_by(desc("qty_sold"))
                .limit(5)
            )
        ).all()
        top_products = [
            {
                "name": r[0],
                "sku": r[1],
                "qty_sold": int(r[2] or 0),
                "revenue": float(r[3] or 0),
            }
            for r in items_rows
        ]

    # 5 Últimos Pedidos
    recent_orders = [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "customer_name": (o.customer_snapshot or {}).get("full_name", "Cliente"),
            "total_amount": float(o.total_amount or 0),
            "production_status": o.production_status or "NEW",
            "payment_status": o.payment_status or "PENDING",
            "created_at": o.created_at.isoformat(),
        }
        for o in all_orders[:5]
    ]

    # Totais legados
    total_products = (
        await db.execute(
            select(func.count(Product.id)).where(Product.tenant_id == tenant_id, Product.is_active == True)
        )
    ).scalar() or 0

    return {
        "period": period,
        "approved_revenue": float(approved_revenue),
        "revenue_growth_pct": round(revenue_growth_pct, 1),
        "paid_orders_count": paid_count,
        "average_ticket": round(avg_ticket, 2),
        "in_production_now": in_production_now,
        "alerts": {
            "pending_art_orders": pending_art_orders,
            "critical_deadline_orders": critical_deadline_orders,
            "low_stock_products": low_stock_products,
        },
        "sales_series": list(day_buckets.values()),
        "top_products": top_products,
        "recent_orders": recent_orders,
        # Compatibilidade legada
        "gmv": float(approved_revenue),
        "total_orders": len(all_orders),
        "total_products": total_products,
    }
