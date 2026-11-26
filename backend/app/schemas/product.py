from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class WholesaleTierBase(BaseModel):
    min_quantity: int = Field(..., ge=1, description="Quantidade mínima da faixa")
    unit_price: Decimal = Field(..., gt=0, description="Preço unitário progressivo")


class WholesaleTierCreate(WholesaleTierBase):
    pass


class WholesaleTierResponse(WholesaleTierBase):
    id: UUID
    product_id: UUID

    model_config = ConfigDict(from_attributes=True)


class ProductVariantBase(BaseModel):
    sku: str
    name: str
    attribute_options: Dict[str, Any] = Field(default_factory=dict)
    price_modifier: Decimal = Decimal("0.00")
    final_price: Decimal = Field(..., ge=0)
    stock_quantity: Optional[int] = None
    weight_grams: Optional[int] = None
    image_url: Optional[str] = None
    is_active: bool = True


class ProductVariantCreate(ProductVariantBase):
    id: Optional[UUID] = None


class ProductVariantResponse(ProductVariantBase):
    id: UUID
    tenant_id: UUID
    product_id: UUID

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    category_id: Optional[UUID] = None
    name: str
    slug: str
    sku: str
    product_type: str = "simple"
    description: Optional[str] = None
    short_description: Optional[str] = None
    base_price: Decimal = Field(..., ge=0)
    compare_at_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    image_url: Optional[str] = None
    images_json: List[str] = Field(default_factory=list)

    # Status e destaque
    status: str = "ACTIVE"
    badge_label: Optional[str] = None
    is_featured: bool = False
    is_active: bool = True

    # Estoque
    track_inventory: bool = False
    stock_quantity: int = 0
    low_stock_threshold: int = 5
    allow_backorder: bool = False

    # Dimensões e frete
    is_physical: bool = True
    weight_grams: int = 300
    length_cm: int = 16
    width_cm: int = 12
    height_cm: int = 10

    # Customização
    enable_text_customization: bool = False
    text_customization_label: Optional[str] = "Nome ou Frase para Personalizar"
    text_max_length: int = 40

    enable_artwork_upload: bool = False
    upload_max_size_mb: int = 10
    allowed_upload_formats: List[str] = ["png", "jpg", "jpeg", "svg", "pdf"]

    production_lead_time_days: int = 0

    # SEO
    seo_title: Optional[str] = Field(default=None, max_length=70)
    seo_description: Optional[str] = Field(default=None, max_length=160)


class ProductCreate(ProductBase):
    wholesale_tiers: Optional[List[WholesaleTierCreate]] = []
    variants: Optional[List[ProductVariantCreate]] = []


class ProductUpdate(BaseModel):
    category_id: Optional[UUID] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    product_type: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    base_price: Optional[Decimal] = None
    compare_at_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    image_url: Optional[str] = None
    images_json: Optional[List[str]] = None

    status: Optional[str] = None
    badge_label: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

    track_inventory: Optional[bool] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    allow_backorder: Optional[bool] = None

    is_physical: Optional[bool] = None
    weight_grams: Optional[int] = None
    length_cm: Optional[int] = None
    width_cm: Optional[int] = None
    height_cm: Optional[int] = None

    enable_text_customization: Optional[bool] = None
    text_customization_label: Optional[str] = None
    text_max_length: Optional[int] = None

    enable_artwork_upload: Optional[bool] = None
    upload_max_size_mb: Optional[int] = None
    allowed_upload_formats: Optional[List[str]] = None

    production_lead_time_days: Optional[int] = None
    seo_title: Optional[str] = Field(default=None, max_length=70)
    seo_description: Optional[str] = Field(default=None, max_length=160)

    wholesale_tiers: Optional[List[WholesaleTierCreate]] = None
    variants: Optional[List[ProductVariantCreate]] = None


class ProductQuickUpdate(BaseModel):
    base_price: Optional[Decimal] = Field(default=None, ge=0)
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    track_inventory: Optional[bool] = None
    category_id: Optional[UUID] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    wholesale_tiers: List[WholesaleTierResponse] = []
    variants: List[ProductVariantResponse] = []

    model_config = ConfigDict(from_attributes=True)
