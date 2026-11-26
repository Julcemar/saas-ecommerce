from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


class CustomerAddressBase(BaseModel):
    label: Optional[str] = "Principal"
    address_type: str = "shipping"
    postal_code: str = ""
    street: str
    number: str = "s/n"
    complement: Optional[str] = None
    neighborhood: str = ""
    city: str
    state: str = Field(..., min_length=2, max_length=2)
    country: str = "BR"
    is_default: bool = False


class CustomerAddressCreate(CustomerAddressBase):
    pass


class CustomerAddressUpdate(BaseModel):
    label: Optional[str] = None
    address_type: Optional[str] = None
    postal_code: Optional[str] = None
    street: Optional[str] = None
    number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(default=None, min_length=2, max_length=2)
    is_default: Optional[bool] = None


class CustomerAddressResponse(CustomerAddressBase):
    id: UUID
    tenant_id: UUID
    customer_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerBase(BaseModel):
    person_type: str = "PF"  # PF / INDIVIDUAL ou PJ / COMPANY
    full_name: str
    company_name: Optional[str] = None
    tax_id: Optional[str] = None
    state_tax_id: Optional[str] = None
    email: Optional[str] = None
    phone: str = ""
    birth_date: Optional[date] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class CustomerCreate(CustomerBase):
    address: Optional[CustomerAddressCreate] = None


class CustomerUpdate(BaseModel):
    person_type: Optional[str] = None
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    tax_id: Optional[str] = None
    state_tax_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class CustomerOrderSummary(BaseModel):
    id: UUID
    order_number: str
    production_status: str
    payment_status: str
    total_amount: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerResponse(CustomerBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    addresses: List[CustomerAddressResponse] = []
    orders_count: int = 0
    total_spent: Decimal = Decimal("0.00")
    last_order_at: Optional[datetime] = None
    default_city: Optional[str] = None
    default_state: Optional[str] = None
    orders: List[CustomerOrderSummary] = []

    model_config = ConfigDict(from_attributes=True)
