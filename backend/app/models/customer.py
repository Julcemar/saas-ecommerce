import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.base_types import GUID


class Customer(Base):
    __tablename__ = "customers"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    tenant_id = Column(GUID, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    person_type = Column(String(2), nullable=False, default="PF")  # 'PF', 'PJ'
    full_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    tax_id = Column(String(30), nullable=False)  # CPF/CNPJ
    state_tax_id = Column(String(50), nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    orders = relationship("Order", back_populates="customer")
