import logging
import re
from typing import Optional, Dict, Any
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import HTTPException, status, Depends
from sqlalchemy import select
from app.config import settings
from app import database
from app.models.tenant import Tenant
from app.redis_client import get_cached_tenant, set_cached_tenant

logger = logging.getLogger(__name__)


def extract_host(request: Request) -> str:
    """Extrai o host da requisição a partir de X-Forwarded-Host ou Host."""
    x_forwarded_host = request.headers.get("x-forwarded-host")
    if x_forwarded_host:
        host = x_forwarded_host.split(",")[0].strip()
    else:
        host = request.headers.get("host", "")
    # Remove porta se presente (ex: localhost:8000 -> localhost)
    return host.split(":")[0].lower()


def is_main_domain(host: str) -> bool:
    """Verifica se o host corresponde a um dos domínios centrais da plataforma."""
    for domain in settings.MAIN_DOMAINS:
        if host == domain or host == f"www.{domain}":
            return True
    return False


def extract_subdomain(host: str) -> Optional[str]:
    """
    Extrai o subdomínio se for um subdomínio de um domínio principal cadastrado.
    Ex: 'loja1.seusistema.com.br' -> 'loja1'
    Ex: 'loja1.localhost' -> 'loja1'
    """
    for main_domain in settings.MAIN_DOMAINS:
        if host.endswith(f".{main_domain}"):
            sub = host[: -(len(main_domain) + 1)]
            if sub and sub != "www" and sub != "api" and sub != "app":
                return sub
    return None


async def resolve_tenant(identifier: str, by_slug: bool = True) -> Optional[Dict[str, Any]]:
    """
    Busca o tenant no Redis com fallback no PostgreSQL.
    Retorna um dicionário serializável com os dados essenciais do tenant.
    """
    cache_key = f"slug:{identifier}" if by_slug else f"domain:{identifier}"
    cached = await get_cached_tenant(cache_key)
    if cached:
        return cached

    # Fallback no Banco de Dados
    async with database.AsyncSessionLocal() as session:
        if by_slug:
            stmt = select(Tenant).where(Tenant.slug == identifier, Tenant.is_active == True)
        else:
            stmt = select(Tenant).where(
                Tenant.custom_domain == identifier,
                Tenant.domain_verified == True,
                Tenant.is_active == True
            )
        result = await session.execute(stmt)
        tenant: Optional[Tenant] = result.scalar_one_or_none()

        if tenant:
            tenant_data = {
                "id": str(tenant.id),
                "name": tenant.name,
                "slug": tenant.slug,
                "custom_domain": tenant.custom_domain,
                "domain_verified": tenant.domain_verified,
                "primary_color": tenant.primary_color,
                "secondary_color": tenant.secondary_color,
                "logo_url": tenant.logo_url,
                "settings_json": tenant.settings_json,
                "is_active": tenant.is_active,
            }
            # Grava no cache por 5 min
            await set_cached_tenant(cache_key, tenant_data)
            return tenant_data

    return None


class TenantResolutionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.tenant = None
        request.state.is_platform_root = False

        # Header de override explícito (útil para desenvolvimento, testes e proxies de frontend)
        header_tenant_slug = request.headers.get("x-tenant-slug")
        query_tenant_slug = request.query_params.get("tenant")

        if header_tenant_slug:
            tenant = await resolve_tenant(header_tenant_slug.lower(), by_slug=True)
            request.state.tenant = tenant
            return await call_next(request)

        if query_tenant_slug:
            tenant = await resolve_tenant(query_tenant_slug.lower(), by_slug=True)
            if tenant:
                request.state.tenant = tenant
                return await call_next(request)

        host = extract_host(request)

        if not host or is_main_domain(host):
            request.state.is_platform_root = True
            return await call_next(request)

        subdomain = extract_subdomain(host)
        if subdomain:
            tenant = await resolve_tenant(subdomain, by_slug=True)
            request.state.tenant = tenant
        else:
            # Caso não seja subdomínio do sistema, pode ser um domínio customizado de cliente
            tenant = await resolve_tenant(host, by_slug=False)
            request.state.tenant = tenant

        return await call_next(request)


def get_current_tenant(request: Request) -> Dict[str, Any]:
    """
    Dependency para rotas que exigem tenant ativo.
    Garante o isolamento lógico estrito.
    """
    tenant = getattr(request.state, "tenant", None)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant não encontrado ou inativo para este domínio."
        )
    return tenant


def get_optional_tenant(request: Request) -> Optional[Dict[str, Any]]:
    """Dependency para rotas públicas onde o tenant pode ou não estar presente."""
    return getattr(request.state, "tenant", None)
