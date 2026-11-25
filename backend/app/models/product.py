import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Integer, Numeric,
    ForeignKey
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base_types import GUID, JSON_TYPE, ARRAY_TYPE


class Product(Base):
    __tablename__ = "products"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(GUID, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=False)
    product_type = Column(String(20), nullable=False, default="simple")  # 'simple', 'variable'
    description = Column(Text, nullable=True)
    short_description = Column(Text, nullable=True)
    base_price = Column(Numeric(12, 2), nullable=False)
    compare_at_price = Column(Numeric(12, 2), nullable=True)
    cost_price = Column(Numeric(12, 2), nullable=True)
    image_url = Column(Text, nullable=True)

    # Dimensões e frete
    weight_grams = Column(Integer, nullable=False, default=300)
    length_cm = Column(Integer, nullable=False, default=16)
    width_cm = Column(Integer, nullable=False, default=12)
    height_cm = Column(Integer, nullable=False, default=10)

    # Badges Pop-Art & Visibilidade
    badge_label = Column(String(50), nullable=True)
    is_featured = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

    # Personalização industrial
    enable_text_customization = Column(Boolean, nullable=False, default=False)
    text_customization_label = Column(String(255), default="Nome ou Frase para Personalizar")
    text_max_length = Column(Integer, nullable=False, default=40)

    enable_artwork_upload = Column(Boolean, nullable=False, default=False)
    upload_max_size_mb = Column(Integer, nullable=False, default=10)
    allowed_upload_formats = Column(ARRAY_TYPE, nullable=False, default=lambda: ["png", "jpg", "jpeg", "svg", "pdf"])

    production_lead_time_days = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamentos
    tenant = relationship("Tenant", back_populates="products")
    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    wholesale_tiers = relationship(
        "ProductWholesaleTier",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductWholesaleTier.min_quantity"
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    attribute_options = Column(JSON_TYPE, nullable=False, default={})
    price_modifier = Column(Numeric(12, 2), nullable=False, default=0.00)
    final_price = Column(Numeric(12, 2), nullable=False)
    stock_quantity = Column(Integer, nullable=True)
    weight_grams = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="variants")


class ProductWholesaleTier(Base):
    __tablename__ = "product_wholesale_tiers"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    min_quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="wholesale_tiers")
