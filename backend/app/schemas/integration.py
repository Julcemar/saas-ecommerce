from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class IntegrationInfo(BaseModel):
    provider: str
    category: str
    title: str
    description: str
    badge_color: str
    is_active: bool
    has_credentials: bool
    credentials_masked: Dict[str, Any]
    config_json: Dict[str, Any]
    updated_at: Optional[datetime] = None


class IntegrationSaveRequest(BaseModel):
    credentials: Optional[Dict[str, Any]] = None
    config_json: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class IntegrationToggleRequest(BaseModel):
    is_active: bool


class ShippingItemInput(BaseModel):
    id: Optional[str] = None
    name: str
    quantity: int = 1
    unit_price: float = 39.90
    weight_grams: int = 350
    length_cm: int = 16
    width_cm: int = 12
    height_cm: int = 10


class ShippingCalculateRequest(BaseModel):
    dest_zip: str = Field(..., min_length=8, max_length=9, description="CEP de entrega (00000-000)")
    items: List[ShippingItemInput]


class ShippingCalculateResponse(BaseModel):
    origin_zip: str
    dest_zip: str
    options: List[Dict[str, Any]]
