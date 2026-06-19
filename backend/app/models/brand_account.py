import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class BrandAccount(Base):
    __tablename__ = "brand_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(20), nullable=False)  # META | GOOGLE
    account_id = Column(String(100), nullable=False)
    account_name = Column(String(200))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    brand = relationship("Brand", back_populates="accounts")

    __table_args__ = (
        UniqueConstraint("tenant_id", "platform", "account_id", name="uq_brand_account"),
    )
