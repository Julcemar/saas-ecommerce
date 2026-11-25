from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import (
    TenantPublic, TenantUpdate, TenantCustomDomainRequest, TenantVerifyDomainResponse
)
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth
from app.services.dns_service import verify_cname_dns
from app.redis_client import invalidate_tenant_cache
from app.config import settings

router = APIRouter(prefix="/tenant", tags=["Tenant & Domínios"])


@router.get("/me", response_model=TenantPublic)
async def get_active_tenant_public(
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna as informações do tenant ativo resolvido pelo middleware
    para a injeção dinâmica de CSS e identidade visual da loja.
    """
    stmt = select(Tenant).where(Tenant.id == tenant_dict["id"])
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")
    return TenantPublic.model_validate(tenant)


@router.put("/settings", response_model=TenantPublic)
async def update_tenant_settings(
    payload: TenantUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Atualiza dados da loja (cores, nome, logo e configurações).
    Requer autenticação do lojista pertencente ao tenant.
    """
    if str(user.tenant_id) != str(tenant_dict["id"]) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado a este tenant.")

    stmt = select(Tenant).where(Tenant.id == tenant_dict["id"])
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    if payload.name is not None:
        tenant.name = payload.name
    if payload.primary_color is not None:
        tenant.primary_color = payload.primary_color
    if payload.secondary_color is not None:
        tenant.secondary_color = payload.secondary_color
    if payload.logo_url is not None:
        tenant.logo_url = payload.logo_url
    if payload.settings_json is not None:
        tenant.settings_json = {**tenant.settings_json, **payload.settings_json}

    await db.commit()
    await db.refresh(tenant)

    # Invalida cache no Redis
    await invalidate_tenant_cache(tenant.slug, tenant.custom_domain)

    return TenantPublic.model_validate(tenant)


@router.post("/custom-domain")
async def set_custom_domain(
    payload: TenantCustomDomainRequest,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Define o domínio próprio da loja e orienta o lojista a apontar o CNAME.
    """
    if str(user.tenant_id) != str(tenant_dict["id"]) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado a este tenant.")

    clean_domain = payload.custom_domain.strip().lower()

    # Valida se outro tenant já usa este domínio
    conflict_stmt = select(Tenant).where(Tenant.custom_domain == clean_domain, Tenant.id != tenant_dict["id"])
    conflict_res = await db.execute(conflict_stmt)
    if conflict_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este domínio já está associado a outra loja.")

    stmt = select(Tenant).where(Tenant.id == tenant_dict["id"])
    res = await db.execute(stmt)
    tenant = res.scalar_one_or_none()

    old_domain = tenant.custom_domain
    tenant.custom_domain = clean_domain
    tenant.domain_verified = False  # Reset até verificação DNS
    await db.commit()

    await invalidate_tenant_cache(tenant.slug, old_domain)

    return {
        "message": "Domínio salvo com sucesso. Configure o apontamento CNAME no seu provedor de DNS.",
        "custom_domain": clean_domain,
        "dns_target": settings.CNAME_TARGET,
        "domain_verified": False
    }


@router.post("/verify-dns", response_model=TenantVerifyDomainResponse)
async def verify_domain_dns(
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Valida em tempo real o CNAME do domínio via dnspython.
    Se válido, marca domain_verified = True permitindo a emissão de SSL pelo Caddy.
    """
    if str(user.tenant_id) != str(tenant_dict["id"]) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado a este tenant.")

    stmt = select(Tenant).where(Tenant.id == tenant_dict["id"])
    res = await db.execute(stmt)
    tenant = res.scalar_one_or_none()

    if not tenant or not tenant.custom_domain:
        raise HTTPException(status_code=400, detail="Nenhum domínio próprio cadastrado para esta loja.")

    is_verified, msg, current_cname = verify_cname_dns(tenant.custom_domain, settings.CNAME_TARGET)

    if is_verified:
        tenant.domain_verified = True
        await db.commit()
        await invalidate_tenant_cache(tenant.slug, tenant.custom_domain)

    return TenantVerifyDomainResponse(
        custom_domain=tenant.custom_domain,
        domain_verified=tenant.domain_verified,
        message=msg,
        dns_target=settings.CNAME_TARGET,
        current_cname=current_cname
    )
