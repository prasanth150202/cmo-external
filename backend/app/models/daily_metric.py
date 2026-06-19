import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Numeric, BigInteger, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    account_id = Column(String(100), nullable=False)
    platform = Column(String(20), nullable=False)  # META | GOOGLE
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
        UniqueConstraint("tenant_id", "account_id", "platform", "date", name="uq_daily_metric"),
    )
