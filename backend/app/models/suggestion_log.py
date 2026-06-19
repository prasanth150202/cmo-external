import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base


class SuggestionLog(Base):
    __tablename__ = "suggestion_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id", ondelete="SET NULL"), nullable=True)
    campaign_id = Column(String(100))
    rule_id = Column(String(20), nullable=False)
    suggestion_json = Column(JSONB, nullable=False)
    applied = Column(Boolean, default=False)
    applied_at = Column(DateTime(timezone=True))
    applied_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
