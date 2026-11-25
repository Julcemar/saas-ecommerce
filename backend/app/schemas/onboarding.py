from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID


class CheckSlugResponse(BaseModel):
    slug: str
    available: bool
    message: str


class OnboardingRequest(BaseModel):
    store_name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-z0-9-]+$")
    owner_name: str = Field(..., min_length=2, max_length=100)
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=6)
    primary_color: str = "#0052B4"
    secondary_color: str = "#FFD100"
    whatsapp_phone: Optional[str] = ""


class OnboardingResponse(BaseModel):
    tenant_id: UUID
    tenant_name: str
    tenant_slug: str
    store_url: str
    admin_url: str
    access_token: str
    user_id: UUID
    message: str
