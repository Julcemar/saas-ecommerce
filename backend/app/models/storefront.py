import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base_types import GUID, JSON_TYPE


class StorefrontBanner(Base):
    __tablename__ = "storefront_banners"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_1 = Column(String(100), nullable=True)
    badge_2 = Column(String(100), nullable=True)
    title_prefix = Column(String(150), nullable=True)
    title_highlight = Column(String(150), nullable=False)
    title_suffix = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    btn_1_text = Column(String(100), nullable=True)
    btn_1_url = Column(String(500), nullable=True)
    btn_2_text = Column(String(100), nullable=True)
    btn_2_url = Column(String(500), nullable=True)
    highlight_1 = Column(String(150), nullable=True)
    highlight_2 = Column(String(150), nullable=True)
    highlight_3 = Column(String(150), nullable=True)
    banner_image_url = Column(Text, nullable=False)
    config_json = Column(JSON_TYPE, nullable=True, default=dict)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    tenant = relationship("Tenant", back_populates="banners")
