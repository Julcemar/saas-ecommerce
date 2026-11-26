import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base_types import GUID, JSON_TYPE


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    custom_domain = Column(String(255), unique=True, nullable=True, index=True)
    domain_verified = Column(Boolean, nullable=False, default=False)
    primary_color = Column(String(20), nullable=False, default="#0052B4")
    secondary_color = Column(String(20), nullable=False, default="#FFD100")
    logo_url = Column(Text, nullable=True)
    home_config = Column(JSON_TYPE, nullable=True, default=dict)
    settings_json = Column(JSON_TYPE, nullable=False, default={
        "currency": "BRL",
        "tax_rate": 0,
        "free_shipping_min_amount": None,
        "whatsapp_phone": "",
        "b2b_cta_enabled": True
    })
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamentos
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="tenant", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="tenant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="tenant", cascade="all, delete-orphan")
    banners = relationship("StorefrontBanner", back_populates="tenant", cascade="all, delete-orphan")
    integrations = relationship("TenantIntegration", back_populates="tenant", cascade="all, delete-orphan")
