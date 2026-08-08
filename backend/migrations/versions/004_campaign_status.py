"""Add status to campaign_daily_metrics

Revision ID: 004
Revises: 003
Create Date: 2026-08-06
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("campaign_daily_metrics", sa.Column("status", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("campaign_daily_metrics", "status")
