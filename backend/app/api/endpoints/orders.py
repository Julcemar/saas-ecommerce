from typing import List, Dict, Any, Optional
from uuid import UUID
import uuid as uuid_lib
from datetime import datetime, timedelta, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.order import Order, OrderItem, OrderHistory
from app.models.customer import Customer
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    OrderCreate,
    ManualOrderCreate,
    OrderResponse,
    OrderStatusUpdate,
    OrderUpdate,
    OrderItemUpdate,
    OrderHistoryCreate,
    OrderHistoryResponse,
)
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth, get_optional_customer
from app.services.order_service import create_order_in_db

router = APIRouter(prefix="/orders", tags=["Pedidos & Produção"])

PRODUCTION_STAGE_LABELS = {
    "NEW": "Entrada / Triagem",
    "ART_APPROVAL": "Arte & Aprovação",
    "IN_PRODUCTION": "Em Produção",
    "QUALITY_PACKING": "Acabamento & Embalagem",
    "READY_TO_SHIP": "Pronto para Envio",
    "SHIPPED": "Enviado / Entregue",
}


def _verify_tenant_access(user: User, tenant_id: Any):
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado a esta loja.")


async def _load_order_full(db: AsyncSession, order_id: Any, tenant_id: Any) -> Optional[Order]:
    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.history))
        .where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def checkout_create_order(
    payload: OrderCreate,
    authenticated_customer: Optional[Customer] = Depends(get_optional_customer),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Cria pedido via checkout da vitrine com cálculo estrito no backend."""
    tenant_id = tenant_dict["id"]
    order = await create_order_in_db(db, tenant_id, payload, authenticated_customer=authenticated_customer)
    full = await _load_order_full(db, order.id, tenant_id)
    return OrderResponse.model_validate(full)


@router.post("/manual", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_order(
    payload: ManualOrderCreate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Cria pedido manual no painel administrativo (WhatsApp / Instagram / Balcão)."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    if not payload.items:
        raise HTTPException(status_code=400, detail="Adicione ao menos um item ao pedido.")

    items_subtotal = Decimal("0.00")
    items_to_create = []
    for item in payload.items:
        prod_img = item.product_image_url
        if item.product_id:
            p_res = await db.execute(
                select(Product).where(Product.id == item.product_id, Product.tenant_id == tenant_id)
            )
            prod = p_res.scalar_one_or_none()
            if not prod:
                raise HTTPException(status_code=400, detail="Produto informado não pertence a esta loja.")
            if not prod_img:
                prod_img = prod.image_url

        sub = Decimal(str(item.unit_price)) * Decimal(item.quantity)
        items_subtotal += sub
        items_to_create.append({
            "product_id": item.product_id,
            "name": item.name,
            "sku": item.sku or "MANUAL",
            "variant_name": item.variant_name,
            "product_image_url": prod_img,
            "unit_price": item.unit_price,
            "quantity": item.quantity,
            "subtotal": sub,
            "custom_text": item.custom_text,
            "customization_notes": item.customization_notes,
            "artwork_url": item.artwork_url,
            "approved_art_url": item.approved_art_url,
            "art_approved": item.art_approved,
            "artwork_status": "approved" if item.art_approved else "pending",
        })

    total_amount = max(
        Decimal("0.00"),
        items_subtotal - Decimal(str(payload.discount_amount)) + Decimal(str(payload.shipping_amount)),
    )
    order_number = f"#PED-{uuid_lib.uuid4().hex[:4].upper()}"
    due = payload.due_date or (date.today() + timedelta(days=3))

    # Vincula ou cria o cliente dentro do mesmo tenant
    linked_customer_id = None
    if payload.customer_id:
        c_res = await db.execute(
            select(Customer).where(Customer.id == payload.customer_id, Customer.tenant_id == tenant_id)
        )
        cust_obj = c_res.scalar_one_or_none()
        if not cust_obj:
            raise HTTPException(status_code=400, detail="Cliente informado não pertence a esta loja.")
        linked_customer_id = cust_obj.id
    else:
        clean_email = (payload.customer_email or "").strip().lower() or None
        clean_tax = (payload.customer_tax_id or "").strip() or None
        cust_obj = None
        if clean_email:
            cust_obj = (
                await db.execute(
                    select(Customer).where(Customer.tenant_id == tenant_id, Customer.email == clean_email)
                )
            ).scalar_one_or_none()
        if not cust_obj and clean_tax:
            cust_obj = (
                await db.execute(
                    select(Customer).where(Customer.tenant_id == tenant_id, Customer.tax_id == clean_tax)
                )
            ).scalar_one_or_none()
        if not cust_obj:
            cust_obj = Customer(
                tenant_id=tenant_id,
                person_type="PJ" if clean_tax and len(clean_tax) > 14 else "PF",
                full_name=payload.customer_name.strip(),
                tax_id=clean_tax,
                email=clean_email,
                phone=payload.customer_phone.strip(),
            )
            db.add(cust_obj)
            await db.flush()
        linked_customer_id = cust_obj.id

    order = Order(
        tenant_id=tenant_id,
        order_number=order_number,
        customer_id=linked_customer_id,
        status="payment_confirmed" if payload.payment_status == "PAID" else "pending_payment",
        production_status=payload.production_status or "NEW",
        due_date=due,
        priority=payload.priority or "NORMAL",
        internal_notes=payload.internal_notes,
        items_subtotal=items_subtotal,
        discount_amount=payload.discount_amount,
        shipping_amount=payload.shipping_amount,
        total_amount=total_amount,
        payment_method=payload.payment_method or "pix",
        payment_status=payload.payment_status or "PENDING",
        estimated_production_days=3,
        estimated_delivery_date=due,
        customer_snapshot={
            "full_name": payload.customer_name,
            "phone": payload.customer_phone,
            "email": payload.customer_email or "",
            "tax_id": payload.customer_tax_id or "",
        },
        shipping_address_snapshot=payload.shipping_address or {},
        billing_address_snapshot=payload.shipping_address or {},
    )
    db.add(order)
    await db.flush()

    for it in items_to_create:
        db.add(OrderItem(tenant_id=tenant_id, order_id=order.id, **it))

    db.add(OrderHistory(
        tenant_id=tenant_id,
        order_id=order.id,
        actor_name=user.name,
        event_type="CREATED",
        to_status=order.production_status,
        message=f"Pedido manual criado por {user.name}.",
    ))

    await db.commit()
    full = await _load_order_full(db, order.id, tenant_id)
    return OrderResponse.model_validate(full)


@router.get("", response_model=List[OrderResponse])
async def list_tenant_orders(
    status_filter: Optional[str] = None,
    production_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos os pedidos da loja com filtros de produção, pagamento e busca."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = (
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.history))
        .where(Order.tenant_id == tenant_id)
        .order_by(desc(Order.created_at))
    )

    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    if production_status:
        stmt = stmt.where(Order.production_status == production_status)
    if payment_status:
        stmt = stmt.where(Order.payment_status == payment_status)
    if priority:
        stmt = stmt.where(Order.priority == priority)

    orders = (await db.execute(stmt)).scalars().all()

    if search and search.strip():
        q = search.strip().lower()
        filtered = []
        for o in orders:
            cust_name = str((o.customer_snapshot or {}).get("full_name", "")).lower()
            items_match = any(q in (it.name or "").lower() for it in o.items)
            if q in (o.order_number or "").lower() or q in cust_name or items_match:
                filtered.append(o)
        orders = filtered

    return [OrderResponse.model_validate(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: UUID,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Consulta um pedido por ID garantindo isolamento por tenant_id."""
    tenant_id = tenant_dict["id"]
    order = await _load_order_full(db, order_id, tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    return OrderResponse.model_validate(order)


@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order_operational(
    order_id: UUID,
    payload: OrderUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza etapa de produção, pagamento, prazo, prioridade, endereço ou rastreio."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    order = await _load_order_full(db, order_id, tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    data = payload.model_dump(exclude_unset=True)

    if "production_status" in data and data["production_status"] != order.production_status:
        old_stage = order.production_status
        new_stage = data["production_status"]
        db.add(OrderHistory(
            tenant_id=tenant_id,
            order_id=order.id,
            actor_name=user.name,
            event_type="STATUS_CHANGE",
            from_status=old_stage,
            to_status=new_stage,
            message=f"Etapa alterada de '{PRODUCTION_STAGE_LABELS.get(old_stage, old_stage)}' para '{PRODUCTION_STAGE_LABELS.get(new_stage, new_stage)}'.",
        ))

    if "payment_status" in data and data["payment_status"] != order.payment_status:
        db.add(OrderHistory(
            tenant_id=tenant_id,
            order_id=order.id,
            actor_name=user.name,
            event_type="STATUS_CHANGE",
            from_status=order.payment_status,
            to_status=data["payment_status"],
            message=f"Status de pagamento alterado para {data['payment_status']}.",
        ))

    if "shipping_tracking_code" in data and data["shipping_tracking_code"] != order.shipping_tracking_code:
        db.add(OrderHistory(
            tenant_id=tenant_id,
            order_id=order.id,
            actor_name=user.name,
            event_type="SHIPPING_UPDATE",
            message=f"Código de rastreio atualizado: {data['shipping_tracking_code'] or 'removido'}.",
        ))

    for key, val in data.items():
        setattr(order, key, val)

    await db.commit()
    full = await _load_order_full(db, order.id, tenant_id)
    return OrderResponse.model_validate(full)


@router.put("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Compatibilidade legada para atualização rápida de status."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    order = await _load_order_full(db, order_id, tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    old_status = order.status
    order.status = payload.status
    if payload.status in ["payment_confirmed", "paid", "PAID"]:
        order.payment_status = "PAID"

    db.add(OrderHistory(
        tenant_id=tenant_id,
        order_id=order.id,
        actor_name=user.name,
        event_type="STATUS_CHANGE",
        from_status=old_status,
        to_status=payload.status,
        message=f"Status alterado para {payload.status}.",
    ))

    await db.commit()
    full = await _load_order_full(db, order.id, tenant_id)
    return OrderResponse.model_validate(full)


@router.patch("/{order_id}/items/{item_id}", response_model=OrderResponse)
async def update_order_item_customization(
    order_id: UUID,
    item_id: UUID,
    payload: OrderItemUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza texto de personalização, arte final e aprovação de um item do pedido."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    stmt = select(OrderItem).where(
        OrderItem.id == item_id,
        OrderItem.order_id == order_id,
        OrderItem.tenant_id == tenant_id,
    )
    item = (await db.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item do pedido não encontrado.")

    data = payload.model_dump(exclude_unset=True)
    if "art_approved" in data:
        item.artwork_status = "approved" if data["art_approved"] else "pending"

    for key, val in data.items():
        setattr(item, key, val)

    db.add(OrderHistory(
        tenant_id=tenant_id,
        order_id=order_id,
        actor_name=user.name,
        event_type="ART_UPDATE",
        message=f"Personalização/arte de '{item.name}' atualizada por {user.name}.",
    ))

    await db.commit()
    full = await _load_order_full(db, order_id, tenant_id)
    return OrderResponse.model_validate(full)


@router.post("/{order_id}/history", response_model=OrderHistoryResponse, status_code=status.HTTP_201_CREATED)
async def add_order_history_note(
    order_id: UUID,
    payload: OrderHistoryCreate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """Registra uma nota interna na timeline de produção do pedido."""
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    order = await _load_order_full(db, order_id, tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    entry = OrderHistory(
        tenant_id=tenant_id,
        order_id=order_id,
        actor_name=user.name,
        event_type=payload.event_type or "NOTE",
        message=payload.message.strip(),
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return OrderHistoryResponse.model_validate(entry)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: UUID,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = tenant_dict["id"]
    _verify_tenant_access(user, tenant_id)

    order = await _load_order_full(db, order_id, tenant_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    await db.delete(order)
    await db.commit()
    return None
