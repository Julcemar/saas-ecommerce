import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Date, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base_types import GUID, JSON_TYPE


class Customer(Base):
    __tablename__ = "customers"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    person_type = Column(String(20), nullable=False, default="PF")  # 'PF' (INDIVIDUAL) | 'PJ' (COMPANY)
    full_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    tax_id = Column(String(30), nullable=True)  # CPF/CNPJ
    state_tax_id = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(30), nullable=False, default="")
    password_hash = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    birth_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(JSON_TYPE, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    orders = relationship("Order", back_populates="customer")
    addresses = relationship(
        "CustomerAddress",
        back_populates="customer",
        cascade="all, delete-orphan",
        order_by="CustomerAddress.is_default.desc(), CustomerAddress.created_at.asc()",
    )


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(GUID, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    address_type = Column(String(20), nullable=False, default="shipping")
    label = Column(String(100), nullable=True, default="Principal")
    postal_code = Column(String(20), nullable=False, default="")
    street = Column(String(255), nullable=False)
    number = Column(String(50), nullable=False, default="s/n")
    complement = Column(String(255), nullable=True)
    neighborhood = Column(String(255), nullable=False, default="")
    city = Column(String(255), nullable=False)
    state = Column(String(2), nullable=False)
    country = Column(String(2), nullable=False, default="BR")
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="addresses")
