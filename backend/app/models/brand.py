import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class Brand(Base):
    __tablename__ = "brands"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    color = Column(String(7))
    industry = Column(String(100))
    target_roas = Column(Numeric(10, 2))
    monthly_budget_cap = Column(Numeric(15, 2))
    currency = Column(String(3), default="INR")
    logo_url = Column(String)
    website_url = Column(String)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="brands")
    accounts = relationship("BrandAccount", back_populates="brand", cascade="all, delete-orphan")
