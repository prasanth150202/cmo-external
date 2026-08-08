import uuid
from sqlalchemy import Column, String, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.db.base import Base


class CampaignClassification(Base):
    __tablename__ = "campaign_classifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    account_id = Column(String(100), nullable=False)
    platform = Column(String(20), nullable=False)
    campaign_id = Column(String(100), nullable=False)
    campaign_type = Column(String(20), nullable=False, default="SALES")  # 'SALES' | 'LEAD_GEN'
    source = Column(String(10), nullable=False, default="AUTO")  # 'AUTO' | 'MANUAL'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("tenant_id", "account_id", "platform", "campaign_id", name="uq_campaign_classification"),
    )
