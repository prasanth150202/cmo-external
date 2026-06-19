import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, ARRAY, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(20), nullable=False)  # META | GOOGLE
    access_token = Column(String, nullable=False)   # Fernet encrypted
    refresh_token = Column(String)                  # Fernet encrypted (Google only)
    expires_at = Column(DateTime(timezone=True))
    platform_user_id = Column(String(100))
    scopes = Column(ARRAY(String))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    tenant = relationship("Tenant", back_populates="oauth_tokens")

    __table_args__ = (
        UniqueConstraint("tenant_id", "platform", name="uq_oauth_token"),
    )
