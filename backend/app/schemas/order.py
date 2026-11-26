from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


class OrderItemInput(BaseModel):
    product_id: UUID
    quantity: int = Field(..., ge=1)
    variant_name: Optional[str] = None
    custom_text: Optional[str] = None
    customization_notes: Optional[str] = None
    customization_answers: List[Dict[str, Any]] = Field(default_factory=list)
    artwork_url: Optional[str] = None
    artwork_filename: Optional[str] = None


class ManualOrderItemInput(BaseModel):
    product_id: Optional[UUID] = None
    name: str
    sku: str = "MANUAL"
    variant_name: Optional[str] = None
    product_image_url: Optional[str] = None
    unit_price: Decimal = Field(..., ge=0)
    quantity: int = Field(..., ge=1)
    custom_text: Optional[str] = None
    customization_notes: Optional[str] = None
    customization_answers: List[Dict[str, Any]] = Field(default_factory=list)
    artwork_url: Optional[str] = None
    approved_art_url: Optional[str] = None
    art_approved: bool = False


class CustomerInput(BaseModel):
    person_type: str = "PF"  # 'PF', 'PJ'
    full_name: str
    company_name: Optional[str] = None
    tax_id: str  # CPF/CNPJ
    state_tax_id: Optional[str] = None
    email: EmailStr
    phone: str


class AddressInput(BaseModel):
    postal_code: str = ""
    street: str = ""
    number: str = ""
    complement: Optional[str] = None
    neighborhood: str = ""
    city: str = ""
    state: str = ""
    country: str = "BR"


class OrderCreate(BaseModel):
    items: List[OrderItemInput]
    customer: CustomerInput
    shipping_address: AddressInput
    payment_method: str = "pix"
    installments: int = 1
    shipping_provider: Optional[str] = "melhorenvio"
    shipping_service_name: Optional[str] = "SEDEX"
    shipping_amount: Decimal = Decimal("0.00")


class ManualOrderCreate(BaseModel):
    customer_id: Optional[UUID] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    customer_tax_id: Optional[str] = None
    shipping_address: Optional[Dict[str, Any]] = Field(default_factory=dict)
    items: List[ManualOrderItemInput]
    discount_amount: Decimal = Decimal("0.00")
    shipping_amount: Decimal = Decimal("0.00")
    payment_method: str = "pix"
    payment_status: str = "PENDING"
    production_status: str = "NEW"
    priority: str = "NORMAL"
    due_date: Optional[date] = None
    internal_notes: Optional[str] = None


class OrderItemUpdate(BaseModel):
    custom_text: Optional[str] = None
    customization_notes: Optional[str] = None
    customization_answers: List[Dict[str, Any]] = Field(default_factory=list)
    artwork_url: Optional[str] = None
    approved_art_url: Optional[str] = None
    art_approved: Optional[bool] = None
    artwork_status: Optional[str] = None
    production_notes: Optional[str] = None


class OrderUpdate(BaseModel):
    production_status: Optional[str] = None
    payment_status: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[str] = None
    shipping_tracking_code: Optional[str] = None
    shipping_service_name: Optional[str] = None
    shipping_provider: Optional[str] = None
    shipping_address_snapshot: Optional[Dict[str, Any]] = None
    internal_notes: Optional[str] = None


class OrderHistoryCreate(BaseModel):
    message: str
    event_type: str = "NOTE"


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: Optional[UUID] = None
    sku: str
    name: str
    variant_name: Optional[str] = None
    product_image_url: Optional[str] = None
    unit_price: Decimal
    quantity: int
    subtotal: Decimal
    custom_text: Optional[str] = None
    customization_notes: Optional[str] = None
    customization_answers: List[Dict[str, Any]] = Field(default_factory=list)
    artwork_url: Optional[str] = None
    artwork_filename: Optional[str] = None
    artwork_status: str
    approved_art_url: Optional[str] = None
    art_approved: bool = False
    production_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OrderHistoryResponse(BaseModel):
    id: UUID
    actor_name: str
    event_type: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    order_number: str
    status: str
    production_status: str = "NEW"
    due_date: Optional[date] = None
    priority: str = "NORMAL"
    internal_notes: Optional[str] = None
    items_subtotal: Decimal
    discount_amount: Decimal
    shipping_amount: Decimal
    total_amount: Decimal
    payment_method: str
    payment_status: str
    pix_qr_code_url: Optional[str] = None
    pix_copy_paste_code: Optional[str] = None
    pix_expiration_date: Optional[datetime] = None
    installments: int
    shipping_provider: Optional[str] = None
    shipping_service_name: Optional[str] = None
    shipping_tracking_code: Optional[str] = None
    estimated_production_days: int
    customer_snapshot: Dict[str, Any]
    shipping_address_snapshot: Dict[str, Any]
    created_at: datetime
    items: List[OrderItemResponse] = []
    history: List[OrderHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: str
