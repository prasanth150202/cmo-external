import uuid
from sqlalchemy import Column, String, Date, DateTime, Numeric, BigInteger, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from app.db.base import Base


class CampaignDailyMetric(Base):
    __tablename__ = "campaign_daily_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    account_id = Column(String(100), nullable=False)
    campaign_id = Column(String(100), nullable=False)
    campaign_name = Column(String(500))
    status = Column(String(20))
    platform = Column(String(20), nullable=False)
    date = Column(Date, nullable=False)
    spend = Column(Numeric(15, 2), default=0)
    revenue = Column(Numeric(15, 2), default=0)
    roas = Column(Numeric(10, 4), default=0)
    conversions = Column(Integer, default=0)
    impressions = Column(BigInteger, default=0)
    clicks = Column(Integer, default=0)
    ctr = Column(Numeric(8, 4), default=0)
    synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("tenant_id", "campaign_id", "platform", "date", name="uq_campaign_metric"),
    )
