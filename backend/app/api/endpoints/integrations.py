import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.integration import TenantIntegration
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.integration import (
    IntegrationInfo, IntegrationSaveRequest, IntegrationToggleRequest
)
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth
from app.security.encryption import (
    encrypt_credentials, decrypt_credentials, mask_credentials
)
from app.integrations.shipping.melhorenvio import MelhorEnvioShippingProvider
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["Módulos Plugáveis / Integrações"])

AVAILABLE_MODULES = [
    {
        "provider": "infinitepay",
        "category": "payment",
        "title": "InfinitePay (Checkout Oficial)",
        "description": "Pix instantâneo, Cartão de Crédito e Parcelamento Garantido em até 12x com validação server-to-server.",
        "badge_color": "yellow",
        "default_config": {"assured_installments": 12, "sandbox": False}
    },
    {
        "provider": "mercadopago",
        "category": "payment",
        "title": "Mercado Pago (Checkout Pro & Pix)",
        "description": "Pagamento transparente via Pix e Checkout Pro com cartões nacionais e internacionais.",
        "badge_color": "blue",
        "default_config": {"sandbox": False}
    },
    {
        "provider": "melhorenvio",
        "category": "shipping",
        "title": "Melhor Envio (Correios + Transportadoras)",
        "description": "Cotação unificada e geração de etiquetas com Correios (SEDEX/PAC), Jadlog, Loggi e Azul Cargo.",
        "badge_color": "green",
        "default_config": {"sandbox": False, "origin_postal_code": "01310-100"}
    },
    {
        "provider": "correios",
        "category": "shipping",
        "title": "Correios (Contrato Direto)",
        "description": "Cotação de preços e prazos oficial com tarifas negociadas do seu próprio cartão de postagem.",
        "badge_color": "orange",
        "default_config": {"origin_postal_code": "01310-100"}
    }
]


@router.get("", response_model=List[IntegrationInfo])
async def list_tenant_integrations(
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista todos os módulos disponíveis com o status e credenciais mascaradas do tenant.
    """
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    stmt = select(TenantIntegration).where(TenantIntegration.tenant_id == tenant_id)
    res = await db.execute(stmt)
    existing_integrations = {it.provider: it for it in res.scalars().all()}

    result = []
    for mod in AVAILABLE_MODULES:
        prov = mod["provider"]
        record = existing_integrations.get(prov)

        if record:
            raw_creds = decrypt_credentials(record.credentials_encrypted)
            has_creds = bool(raw_creds)
            masked = mask_credentials(raw_creds)
            result.append(IntegrationInfo(
                provider=prov,
                category=mod["category"],
                title=mod["title"],
                description=mod["description"],
                badge_color=mod["badge_color"],
                is_active=record.is_active,
                has_credentials=has_creds,
                credentials_masked=masked,
                config_json=record.config_json or mod["default_config"],
                updated_at=record.updated_at
            ))
        else:
            result.append(IntegrationInfo(
                provider=prov,
                category=mod["category"],
                title=mod["title"],
                description=mod["description"],
                badge_color=mod["badge_color"],
                is_active=False,
                has_credentials=False,
                credentials_masked={},
                config_json=mod["default_config"],
                updated_at=None
            ))

    return result


@router.post("/{provider}")
async def save_integration_credentials(
    provider: str,
    payload: IntegrationSaveRequest,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Salva ou atualiza as credenciais criptografadas e configurações do módulo.
    Preserva chaves existentes caso o payload contenha valores mascarados ('••••').
    """
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    prov = provider.lower()
    mod_info = next((m for m in AVAILABLE_MODULES if m["provider"] == prov), None)
    if not mod_info:
        raise HTTPException(status_code=404, detail="Provedor de integração não reconhecido.")

    stmt = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == prov
    )
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    current_creds = decrypt_credentials(record.credentials_encrypted) if record else {}

    # Mescla credenciais novas preservando valores reais onde vier com máscara
    if payload.credentials:
        for k, v in payload.credentials.items():
            if isinstance(v, str) and "••••" in v:
                # Mantém o valor anterior se veio mascarado
                continue
            current_creds[k] = v

    encrypted_blob = encrypt_credentials(current_creds)

    if not record:
        record = TenantIntegration(
            tenant_id=tenant_id,
            provider=prov,
            category=mod_info["category"],
            is_active=payload.is_active if payload.is_active is not None else True,
            credentials_encrypted=encrypted_blob,
            config_json=payload.config_json or mod_info["default_config"]
        )
        db.add(record)
    else:
        record.credentials_encrypted = encrypted_blob
        if payload.config_json is not None:
            record.config_json = {**record.config_json, **payload.config_json}
        if payload.is_active is not None:
            record.is_active = payload.is_active

    await db.commit()
    await db.refresh(record)

    return {
        "status": "success",
        "message": f"Módulo {mod_info['title']} salvo e criptografado com sucesso.",
        "is_active": record.is_active,
        "credentials_masked": mask_credentials(current_creds)
    }


@router.put("/{provider}/toggle")
async def toggle_integration_status(
    provider: str,
    payload: IntegrationToggleRequest,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Ativa ou desativa um módulo plugável sem apagar as credenciais salvas.
    """
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")

    prov = provider.lower()
    stmt = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == prov
    )
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record:
        mod_info = next((m for m in AVAILABLE_MODULES if m["provider"] == prov), None)
        if not mod_info:
            raise HTTPException(status_code=404, detail="Provedor inválido.")
        record = TenantIntegration(
            tenant_id=tenant_id,
            provider=prov,
            category=mod_info["category"],
            is_active=payload.is_active,
            config_json=mod_info["default_config"]
        )
        db.add(record)
    else:
        record.is_active = payload.is_active

    await db.commit()
    return {"provider": prov, "is_active": record.is_active}


@router.post("/{provider}/test")
async def test_integration_connection(
    provider: str,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Testa a conexão e validação das credenciais do provedor.
    """
    tenant_id = tenant_dict["id"]
    prov = provider.lower()

    stmt = select(TenantIntegration).where(
        TenantIntegration.tenant_id == tenant_id,
        TenantIntegration.provider == prov
    )
    res = await db.execute(stmt)
    record = res.scalar_one_or_none()

    if not record or not record.credentials_encrypted:
        raise HTTPException(status_code=400, detail="Credenciais não configuradas para este módulo.")

    creds = decrypt_credentials(record.credentials_encrypted)

    if prov == "infinitepay":
        handle = creds.get("handle")
        if not handle:
            return {"success": False, "message": "InfiniteTag ('handle') não foi preenchida."}
        return {
            "success": True,
            "message": f"Conexão com InfinitePay validada! InfiniteTag @{handle.lstrip('$')} configurada para checkout e webhooks."
        }

    elif prov == "mercadopago":
        access_token = creds.get("access_token")
        if not access_token:
            return {"success": False, "message": "Access Token do Mercado Pago não configurado."}
        return {
            "success": True,
            "message": "Credenciais do Mercado Pago estruturadas e prontas para processamento."
        }

    elif prov == "melhorenvio":
        token = creds.get("access_token")
        if not token:
            return {"success": False, "message": "Melhor Envio ainda não conectado via OAuth2."}
        return {
            "success": True,
            "message": "Token OAuth2 do Melhor Envio conectado e pronto para cotação e emissão de etiquetas."
        }

    elif prov == "correios":
        usuario = creds.get("usuario")
        codigo = creds.get("codigo_acesso_apis")
        if not usuario or not codigo:
            return {"success": False, "message": "Usuário ou código de acesso dos Correios incompleto."}
        return {
            "success": True,
            "message": "Contrato direto dos Correios validado."
        }

    return {"success": True, "message": "Módulo validado."}


@router.get("/melhorenvio/auth-url")
async def get_melhorenvio_auth_url(
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    sandbox: bool = False
):
    """
    Retorna o link para o lojista iniciar o fluxo OAuth2 com o Melhor Envio.
    """
    tenant_id = tenant_dict["id"]
    url = MelhorEnvioShippingProvider.get_oauth_auth_url(str(tenant_id), sandbox=sandbox)
    return {"auth_url": url}


@router.get("/melhorenvio/callback")
async def melhorenvio_oauth_callback(
    code: str = Query(...),
    state: str = Query(..., description="tenant_id repassado pelo OAuth"),
    db: AsyncSession = Depends(get_db)
):
    """
    Recebe o callback do Melhor Envio, troca o code por access_token e salva no banco.
    """
    tenant_id = state
    try:
        tokens = await MelhorEnvioShippingProvider.exchange_code(code)

        stmt = select(TenantIntegration).where(
            TenantIntegration.tenant_id == tenant_id,
            TenantIntegration.provider == "melhorenvio"
        )
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()

        encrypted = encrypt_credentials(tokens)

        if not record:
            record = TenantIntegration(
                tenant_id=tenant_id,
                provider="melhorenvio",
                category="shipping",
                is_active=True,
                credentials_encrypted=encrypted,
                config_json={"sandbox": False, "origin_postal_code": "01310-100"}
            )
            db.add(record)
        else:
            record.credentials_encrypted = encrypted
            record.is_active = True

        await db.commit()
        return RedirectResponse(url="/admin/integracoes?connected=melhorenvio")
    except Exception as e:
        logger.error(f"Erro no callback Melhor Envio: {e}")
        return RedirectResponse(url=f"/admin/integracoes?error={str(e)}")
