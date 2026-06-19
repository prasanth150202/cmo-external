import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    plan = Column(String(20), default="free")
    timezone = Column(String(50), default="UTC")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    brands = relationship("Brand", back_populates="tenant", cascade="all, delete-orphan")
    oauth_tokens = relationship("OAuthToken", back_populates="tenant", cascade="all, delete-orphan")
