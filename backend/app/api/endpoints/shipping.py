import asyncio
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.integration import TenantIntegration
from app.middleware.tenant import get_current_tenant
from app.schemas.integration import ShippingCalculateRequest, ShippingCalculateResponse
from app.security.encryption import decrypt_credentials
from app.integrations.registry import get_shipping_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shipping", tags=["Cálculo de Frete & Logística"])


@router.post("/calculate", response_model=ShippingCalculateResponse)
async def calculate_shipping_rates(
    payload: ShippingCalculateRequest,
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Consulta em paralelo (asyncio.gather) todos os provedores de frete ATIVOS do tenant
    somando pesos e dimensões dos produtos do carrinho.
    """
    tenant_id = tenant_dict["id"]
    dest_zip = payload.dest_zip.strip()

    # 1. Busca provedores de frete ativos no banco para este tenant
    stmt = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.category == "shipping",
        TenantIntegration.is_active == True
    )
    res = await db.execute(stmt)
    active_integrations = res.scalars().all()

    # Prepara lista de itens para cálculo
    items_data = [item.model_dump() for item in payload.items]

    # CEP de origem configurado pelo lojista ou default
    default_origin = "01310-100"

    tasks = []
    task_providers = []

    for integration in active_integrations:
        provider_instance = get_shipping_provider(integration.provider)
        if not provider_instance:
            continue

        creds = decrypt_credentials(integration.credentials_encrypted)
        config = integration.config_json or {}
        origin_zip = config.get("origin_postal_code") or default_origin

        tasks.append(
            provider_instance.calculate_rates(
                origin_zip=origin_zip,
                dest_zip=dest_zip,
                items=items_data,
                tenant_credentials=creds,
                config=config
            )
        )
        task_providers.append(integration.provider)

    combined_options = []

    if tasks:
        # Execução paralela e concorrente
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for idx, res_options in enumerate(results):
            if isinstance(res_options, list):
                combined_options.extend(res_options)
            else:
                logger.error(f"Erro no provedor {task_providers[idx]}: {res_options}")

    # Fallback se nenhum provedor ativo retornou opções (para nunca travar o checkout da loja)
    if not combined_options:
        melhor_envio_fallback = get_shipping_provider("melhorenvio")
        if melhor_envio_fallback:
            fallback_rates = await melhor_envio_fallback.calculate_rates(
                origin_zip=default_origin,
                dest_zip=dest_zip,
                items=items_data,
                tenant_credentials={},
                config={}
            )
            combined_options.extend(fallback_rates)

    # Ordena opções por preço crescente
    combined_options.sort(key=lambda x: x.get("price", 999999))

    return ShippingCalculateResponse(
        origin_zip=default_origin,
        dest_zip=dest_zip,
        options=combined_options
    )
