"""Add campaign_classifications table

Revision ID: 003
Revises: 002
Create Date: 2026-08-05
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "campaign_classifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", sa.String(length=100), nullable=False),
        sa.Column("platform", sa.String(length=20), nullable=False),
        sa.Column("campaign_id", sa.String(length=100), nullable=False),
        sa.Column("campaign_type", sa.String(length=20), nullable=False, server_default="SALES"),
        sa.Column("source", sa.String(length=10), nullable=False, server_default="AUTO"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "account_id", "platform", "campaign_id", name="uq_campaign_classification"),
    )


def downgrade() -> None:
    op.drop_table("campaign_classifications")
