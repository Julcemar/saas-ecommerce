from pydantic import BaseModel, ConfigDict, Field, EmailStr
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class OrderItemInput(BaseModel):
    product_id: UUID
    quantity: int = Field(..., ge=1)
    custom_text: Optional[str] = None
    artwork_url: Optional[str] = None
    artwork_filename: Optional[str] = None


class CustomerInput(BaseModel):
    person_type: str = "PF"  # 'PF', 'PJ'
    full_name: str
    company_name: Optional[str] = None
    tax_id: str  # CPF/CNPJ
    state_tax_id: Optional[str] = None
    email: EmailStr
    phone: str


class AddressInput(BaseModel):
    postal_code: str
    street: str
    number: str
    complement: Optional[str] = None
    neighborhood: str
    city: str
    state: str  # 2 letras ex: SP
    country: str = "BR"


class OrderCreate(BaseModel):
    items: List[OrderItemInput]
    customer: CustomerInput
    shipping_address: AddressInput
    payment_method: str = "pix"  # 'pix', 'credit_card'
    installments: int = 1
    shipping_provider: Optional[str] = "melhorenvio"
    shipping_service_name: Optional[str] = "SEDEX"
    shipping_amount: Decimal = Decimal("0.00")


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: Optional[UUID] = None
    sku: str
    name: str
    unit_price: Decimal
    quantity: int
    subtotal: Decimal
    custom_text: Optional[str] = None
    artwork_url: Optional[str] = None
    artwork_filename: Optional[str] = None
    artwork_status: str

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    order_number: str
    status: str
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

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: str
