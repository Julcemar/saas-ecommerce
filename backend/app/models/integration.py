import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base_types import GUID, JSON_TYPE


class TenantIntegration(Base):
    __tablename__ = "tenant_integrations"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)  # 'infinitepay', 'mercadopago', 'melhorenvio', 'correios'
    category = Column(String(50), nullable=False)  # 'payment', 'shipping', 'messaging', 'analytics'
    is_active = Column(Boolean, nullable=False, default=False)
    credentials_encrypted = Column(Text, nullable=True)
    config_json = Column(JSON_TYPE, nullable=False, default={
        "sandbox": False,
        "webhook_secret": "",
        "origin_postal_code": "",
        "max_installments": 12
    })
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    tenant = relationship("Tenant", back_populates="integrations")
