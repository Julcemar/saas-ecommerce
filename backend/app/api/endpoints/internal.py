import logging
from fastapi import APIRouter, Query, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.tenant import Tenant
from app.config import settings

router = APIRouter(prefix="/internal", tags=["Internal / Caddy SSL"])
logger = logging.getLogger(__name__)


@router.get("/verify-domain")
async def verify_domain_for_caddy(
    domain: str = Query(..., description="Domínio consultado pelo Caddy On-Demand TLS"),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint interno consumido pelo Caddy ('on_demand_tls ask').
    Retorna 200 apenas se o domínio for um domínio próprio cadastrado,
    verificado e ativo na plataforma, autorizando a emissão automática de certificado SSL.
    """
    clean_domain = domain.strip().lower()

    # Domínios centrais do sistema nunca passam por aqui (são cobertos pelo certificado wildcard principal)
    if clean_domain in settings.MAIN_DOMAINS:
        return {"status": "allowed", "domain": clean_domain, "reason": "main_domain"}

    stmt = select(Tenant).where(
        Tenant.custom_domain == clean_domain,
        Tenant.domain_verified == True,
        Tenant.is_active == True
    )
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()

    if not tenant:
        logger.warning(f"Caddy On-Demand TLS recusado para domínio não verificado ou inexistente: {clean_domain}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Domínio não autorizado para emissão de SSL on-demand."
        )

    logger.info(f"Caddy On-Demand TLS aprovado para tenant '{tenant.slug}' (Domínio: {clean_domain})")
    return {
        "status": "allowed",
        "domain": clean_domain,
        "tenant_id": str(tenant.id),
        "tenant_slug": tenant.slug
    }
