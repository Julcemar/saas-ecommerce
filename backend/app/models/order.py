import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, DateTime, Date, Text, Integer, Numeric,
    Boolean, ForeignKey
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

    # Fluxo de Produção & Prazos (Personalizados)
    production_status = Column(String(50), nullable=False, default="NEW")  # NEW, ART_APPROVAL, IN_PRODUCTION, QUALITY_PACKING, READY_TO_SHIP, SHIPPED
    due_date = Column(Date, nullable=True)
    priority = Column(String(20), nullable=False, default="NORMAL")  # NORMAL, URGENT
    internal_notes = Column(Text, nullable=True)

    # Valores
    items_subtotal = Column(Numeric(12, 2), nullable=False)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    shipping_amount = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(12, 2), nullable=False)

    # Pagamento
    payment_method = Column(String(50), nullable=False, default="pix")  # 'pix', 'credit_card', 'boleto', 'manual'
    payment_provider = Column(String(50), nullable=True)  # 'infinitepay', 'mercadopago'
    payment_transaction_id = Column(String(255), nullable=True)
    payment_status = Column(String(50), nullable=False, default="PENDING")  # PENDING, PAID, REFUNDED, CANCELLED
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
    history = relationship(
        "OrderHistory",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="OrderHistory.created_at.desc()",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(GUID, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(GUID, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    variant_id = Column(GUID, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    sku = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    variant_name = Column(String(255), nullable=True)
    product_image_url = Column(Text, nullable=True)
    unit_price = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    # Customização & Arte
    custom_text = Column(String(255), nullable=True)
    customization_notes = Column(Text, nullable=True)
    artwork_url = Column(Text, nullable=True)
    artwork_filename = Column(String(255), nullable=True)
    artwork_status = Column(String(50), nullable=False, default="pending")  # 'pending', 'approved', 'rejected'
    artwork_rejection_reason = Column(Text, nullable=True)
    approved_art_url = Column(Text, nullable=True)
    art_approved = Column(Boolean, nullable=False, default=False)
    production_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="items")


class OrderHistory(Base):
    __tablename__ = "order_history"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(GUID, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_name = Column(String(255), nullable=False, default="Sistema")
    event_type = Column(String(50), nullable=False, default="NOTE")  # CREATED, STATUS_CHANGE, ART_UPDATE, NOTE, SHIPPING_UPDATE
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=True)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="history")
