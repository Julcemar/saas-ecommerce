import logging
from typing import Dict, Any
from uuid import UUID
from fastapi import APIRouter, Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.integration import TenantIntegration
from app.models.order import Order
from app.security.encryption import decrypt_credentials
from app.integrations.registry import get_payment_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks Financeiros"])


@router.post("/infinitepay/{tenant_id}")
async def handle_infinitepay_webhook(
    tenant_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook Oficial da InfinitePay com TRAVA DE SEGURANÇA SERVER-TO-SERVER OBRIGATÓRIA.
    Nunca aprova pedidos baseado apenas no payload do webhook:
    executa chamada POST https://api.checkout.infinitepay.io/payment_check.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    headers = dict(request.headers)
    logger.info(f"Recebido webhook InfinitePay para tenant {tenant_id}: {payload}")

    # 1. Busca credenciais do lojista
    stmt = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == "infinitepay"
    )
    res = await db.execute(stmt)
    integration = res.scalar_one_or_none()

    if not integration:
        logger.warning(f"Tenant {tenant_id} não possui integração com InfinitePay.")
        return {"received": True, "status": "tenant_not_configured"}

    creds = decrypt_credentials(integration.credentials_encrypted)
    config = integration.config_json or {}

    provider_instance = get_payment_provider("infinitepay")
    if not provider_instance:
        raise HTTPException(status_code=500, detail="Provedor InfinitePay não registrado.")

    # 2. Processa com trava server-to-server
    result = await provider_instance.handle_webhook(
        payload=payload,
        headers=headers,
        tenant_credentials=creds,
        config=config
    )

    order_number = result.get("order_number")
    if result.get("status") == "paid" and order_number:
        # 3. Atualiza pedido no banco com isolamento estrito de tenant
        order_stmt = select(Order).where(
            Order.tenant_id == tenant_id,
            Order.order_number == order_number
        )
        order_res = await db.execute(order_stmt)
        order = order_res.scalar_one_or_none()

        if order:
            order.status = "payment_confirmed"
            order.payment_status = "paid"
            order.payment_provider = "infinitepay"
            if result.get("transaction_id"):
                order.payment_transaction_id = result["transaction_id"]
            await db.commit()
            logger.info(f"Pedido {order_number} APROVADO via InfinitePay após verificação server-to-server!")

    return {"received": True, "result": result}


@router.post("/mercadopago/{tenant_id}")
async def handle_mercadopago_webhook(
    tenant_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook do Mercado Pago com verificação server-to-server na API do Mercado Pago.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    headers = dict(request.headers)
    logger.info(f"Recebido webhook Mercado Pago para tenant {tenant_id}: {payload}")

    stmt = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == "mercadopago"
    )
    res = await db.execute(stmt)
    integration = res.scalar_one_or_none()

    if not integration:
        return {"received": True, "status": "tenant_not_configured"}

    creds = decrypt_credentials(integration.credentials_encrypted)
    config = integration.config_json or {}

    provider_instance = get_payment_provider("mercadopago")
    if not provider_instance:
        raise HTTPException(status_code=500, detail="Provedor Mercado Pago não registrado.")

    result = await provider_instance.handle_webhook(
        payload=payload,
        headers=headers,
        tenant_credentials=creds,
        config=config
    )

    order_number = result.get("order_number")
    if result.get("status") == "paid" and order_number:
        order_stmt = select(Order).where(
            Order.tenant_id == tenant_id,
            Order.order_number == order_number
        )
        order_res = await db.execute(order_stmt)
        order = order_res.scalar_one_or_none()

        if order:
            order.status = "payment_confirmed"
            order.payment_status = "paid"
            order.payment_provider = "mercadopago"
            if result.get("transaction_id"):
                order.payment_transaction_id = result["transaction_id"]
            await db.commit()
            logger.info(f"Pedido {order_number} APROVADO via Mercado Pago!")

    return {"received": True, "result": result}
