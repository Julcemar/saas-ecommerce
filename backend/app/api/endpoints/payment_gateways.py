import logging
from typing import Dict, Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.integration import TenantIntegration
from app.models.order import Order
from app.models.tenant import Tenant
from app.middleware.tenant import get_current_tenant
from app.security.encryption import decrypt_credentials
from app.integrations.registry import get_payment_provider
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["Gateways de Pagamento Ativos"])


@router.get("/active-gateways")
async def get_active_payment_gateways(
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna a lista de gateways de pagamento ATIVOS configurados para o tenant
    para renderizar dinamicamente as opções no Checkout da Vitrine.
    """
    tenant_id = tenant_dict["id"]
    stmt = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.category == "payment",
        TenantIntegration.is_active == True
    )
    res = await db.execute(stmt)
    active_integrations = res.scalars().all()

    gateways = []
    for it in active_integrations:
        cfg = it.config_json or {}
        if it.provider == "infinitepay":
            gateways.append({
                "provider": "infinitepay",
                "title": "Pix Instantâneo & Cartão até 12x (InfinitePay)",
                "type": "redirect_checkout",
                "max_installments": cfg.get("assured_installments", 12),
                "badge": "⚡ APROVAÇÃO IMEDIATA"
            })
        elif it.provider == "mercadopago":
            gateways.append({
                "provider": "mercadopago",
                "title": "Mercado Pago (Cartão de Crédito ou Pix)",
                "type": "transparent_or_pro",
                "max_installments": 12,
                "badge": "🔒 MERCADO PAGO"
            })

    # Se o lojista não ativou nenhum gateway terceiro, mantém o Pix nativo da plataforma
    if not gateways:
        gateways.append({
            "provider": "pix",
            "title": "Pix Instantâneo Nacional (QR Code Direto)",
            "type": "pix_native",
            "max_installments": 1,
            "badge": "⚡ PIX DIRETO"
        })

    return {"gateways": gateways}


@router.post("/create-session/{order_id}")
async def create_payment_session(
    order_id: UUID,
    provider_name: str,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Inicia o checkout no gateway de pagamento ativo escolhido pelo cliente.
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

    # Se for Pix nativo
    if provider_name == "pix":
        return {
            "provider": "pix",
            "checkout_url": f"/pedido/{order.id}/obrigado",
            "pix_copy_paste_code": order.pix_copy_paste_code,
            "pix_qr_code_url": order.pix_qr_code_url
        }

    provider_instance = get_payment_provider(provider_name)
    if not provider_instance:
        raise HTTPException(status_code=400, detail=f"Provedor '{provider_name}' não suportado.")

    int_stmt = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == provider_name,
        TenantIntegration.is_active == True
    )
    int_res = await db.execute(int_stmt)
    integration = int_res.scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=400, detail=f"Módulo '{provider_name}' não está ativo para esta loja.")

    creds = decrypt_credentials(integration.credentials_encrypted)
    config = integration.config_json or {}

    # URLs de redirect e webhook específicas deste tenant
    store_slug = tenant_dict.get("slug")
    custom_domain = tenant_dict.get("custom_domain")

    if custom_domain and tenant_dict.get("domain_verified"):
        store_domain = f"https://{custom_domain}"
    else:
        main_domain = settings.MAIN_DOMAINS[0]
        store_domain = f"http://{store_slug}.{main_domain}"

    redirect_url = f"{store_domain}/pedido/{order.id}/obrigado"
    webhook_url = f"{settings.PLATFORM_BASE_URL}/api/webhooks/{provider_name}/{tenant_id}"

    result = await provider_instance.create_checkout(
        order=order,
        tenant_credentials=creds,
        config=config,
        redirect_url=redirect_url,
        webhook_url=webhook_url
    )

    # Atualiza o pedido com os dados da transação
    order.payment_provider = provider_name
    if result.get("transaction_id"):
        order.payment_transaction_id = str(result["transaction_id"])
    if result.get("pix_copy_paste_code"):
        order.pix_copy_paste_code = result["pix_copy_paste_code"]
    if result.get("pix_qr_code_url"):
        order.pix_qr_code_url = result["pix_qr_code_url"]

    await db.commit()

    return result
