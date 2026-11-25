import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, DateTime, Date, Text, Integer, Numeric,
    ForeignKey
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base_types import GUID, JSON_TYPE


class Order(Base):
    __tablename__ = "orders"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    order_number = Column(String(50), nullable=False)
    customer_id = Column(GUID, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), nullable=False, default="pending_payment")
    currency = Column(String(3), nullable=False, default="BRL")

    # Valores
    items_subtotal = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    shipping_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(12, 2), nullable=False)

    # Pagamento
    payment_method = Column(String(50), nullable=False, default="pix")  # 'pix', 'credit_card', 'boleto', 'manual'
    payment_provider = Column(String(50), nullable=True)  # 'infinitepay', 'mercadopago'
    payment_transaction_id = Column(String(255), nullable=True)
    payment_status = Column(String(50), nullable=False, default="unpaid")
    pix_qr_code_url = Column(Text, nullable=True)
    pix_copy_paste_code = Column(Text, nullable=True)
    pix_expiration_date = Column(DateTime(timezone=True), nullable=True)
    installments = Column(Integer, nullable=False, default=1)

    # Frete & Prazos
    shipping_provider = Column(String(50), nullable=True)
    shipping_service_name = Column(String(100), nullable=True)
    shipping_tracking_code = Column(String(100), nullable=True)
    shipping_label_url = Column(Text, nullable=True)
    estimated_production_days = Column(Integer, nullable=False, default=0)
    estimated_delivery_date = Column(Date, nullable=True)

    # Snapshots
    customer_snapshot = Column(JSON_TYPE, nullable=False, default={})
    shipping_address_snapshot = Column(JSON_TYPE, nullable=False, default={})
    billing_address_snapshot = Column(JSON_TYPE, nullable=False, default={})

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relacionamentos
    tenant = relationship("Tenant", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(GUID, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    variant_id = Column(GUID, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    sku = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    # Customização
    custom_text = Column(String(255), nullable=True)
    artwork_url = Column(Text, nullable=True)
    artwork_filename = Column(String(255), nullable=True)
    artwork_status = Column(String(50), nullable=False, default="pending")  # 'pending', 'approved', 'rejected'
    artwork_rejection_reason = Column(Text, nullable=True)
    production_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="items")
