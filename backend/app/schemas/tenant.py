from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime


class TenantBase(BaseModel):
    name: str
    slug: str
    primary_color: str = "#0052B4"
    secondary_color: str = "#FFD100"
    logo_url: Optional[str] = None
    settings_json: Dict[str, Any] = Field(default_factory=lambda: {
        "currency": "BRL",
        "tax_rate": 0,
        "free_shipping_min_amount": None,
        "whatsapp_phone": "",
        "b2b_cta_enabled": True
    })


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    logo_url: Optional[str] = None
    home_config: Optional[Dict[str, Any]] = None
    settings_json: Optional[Dict[str, Any]] = None


class TenantPublic(BaseModel):
    id: UUID
    name: str
    slug: str
    custom_domain: Optional[str] = None
    domain_verified: bool
    primary_color: str
    secondary_color: str
    logo_url: Optional[str] = None
    home_config: Optional[Dict[str, Any]] = None
    settings_json: Dict[str, Any]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TenantCustomDomainRequest(BaseModel):
    custom_domain: str = Field(..., description="Exemplo: loja.meudominio.com.br")


class TenantVerifyDomainResponse(BaseModel):
    custom_domain: str
    domain_verified: bool
    message: str
    dns_target: str
    current_cname: Optional[str] = None
