"""Initial schema — tenants, users, brands, accounts, oauth, metrics, sync, suggestions

Revision ID: 001
Revises:
Create Date: 2026-04-13
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table("tenants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("plan", sa.String(20), server_default="free"),
        sa.Column("timezone", sa.String(50), server_default="UTC"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table("users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("role", sa.String(20), server_default="owner"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])

    op.create_table("brands",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("color", sa.String(7)),
        sa.Column("industry", sa.String(100)),
        sa.Column("target_roas", sa.Numeric(10, 2)),
        sa.Column("monthly_budget_cap", sa.Numeric(15, 2)),
        sa.Column("currency", sa.String(3), server_default="INR"),
        sa.Column("logo_url", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_brands_tenant_id", "brands", ["tenant_id"])

    op.create_table("brand_accounts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("brand_id", UUID(as_uuid=True), sa.ForeignKey("brands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(20), nullable=False),
        sa.Column("account_id", sa.String(100), nullable=False),
        sa.Column("account_name", sa.String(200)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("tenant_id", "platform", "account_id", name="uq_brand_account"),
    )

    op.create_table("oauth_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(20), nullable=False),
        sa.Column("access_token", sa.Text, nullable=False),
        sa.Column("refresh_token", sa.Text),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("platform_user_id", sa.String(100)),
        sa.Column("scopes", ARRAY(sa.String)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("tenant_id", "platform", name="uq_oauth_token"),
    )

    op.create_table("daily_metrics",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", sa.String(100), nullable=False),
        sa.Column("platform", sa.String(20), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("spend", sa.Numeric(15, 2), server_default="0"),
        sa.Column("revenue", sa.Numeric(15, 2), server_default="0"),
        sa.Column("roas", sa.Numeric(10, 4), server_default="0"),
        sa.Column("conversions", sa.Integer, server_default="0"),
        sa.Column("impressions", sa.BigInteger, server_default="0"),
        sa.Column("clicks", sa.Integer, server_default="0"),
        sa.Column("ctr", sa.Numeric(8, 4), server_default="0"),
        sa.Column("synced_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("tenant_id", "account_id", "platform", "date", name="uq_daily_metric"),
    )
    op.create_index("ix_daily_metrics_tenant_date", "daily_metrics", ["tenant_id", "date"])

    op.create_table("campaign_daily_metrics",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", sa.String(100), nullable=False),
        sa.Column("campaign_id", sa.String(100), nullable=False),
        sa.Column("campaign_name", sa.String(500)),
        sa.Column("platform", sa.String(20), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("spend", sa.Numeric(15, 2), server_default="0"),
        sa.Column("revenue", sa.Numeric(15, 2), server_default="0"),
        sa.Column("roas", sa.Numeric(10, 4), server_default="0"),
        sa.Column("conversions", sa.Integer, server_default="0"),
        sa.Column("impressions", sa.BigInteger, server_default="0"),
        sa.Column("clicks", sa.Integer, server_default="0"),
        sa.Column("ctr", sa.Numeric(8, 4), server_default="0"),
        sa.Column("synced_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("tenant_id", "campaign_id", "platform", "date", name="uq_campaign_metric"),
    )
    op.create_index("ix_campaign_metrics_tenant_date", "campaign_daily_metrics", ["tenant_id", "date"])

    op.create_table("sync_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", sa.String(100), nullable=False),
        sa.Column("platform", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("rows_synced", sa.Integer, server_default="0"),
        sa.Column("error", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_sync_jobs_tenant_id", "sync_jobs", ["tenant_id"])

    op.create_table("suggestion_log",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), nullable=False),
        sa.Column("brand_id", UUID(as_uuid=True), sa.ForeignKey("brands.id", ondelete="SET NULL"), nullable=True),
        sa.Column("campaign_id", sa.String(100)),
        sa.Column("rule_id", sa.String(20), nullable=False),
        sa.Column("suggestion_json", JSONB, nullable=False),
        sa.Column("applied", sa.Boolean, server_default="false"),
        sa.Column("applied_at", sa.DateTime(timezone=True)),
        sa.Column("applied_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_suggestion_log_tenant_id", "suggestion_log", ["tenant_id"])


def downgrade() -> None:
    op.drop_table("suggestion_log")
    op.drop_table("sync_jobs")
    op.drop_table("campaign_daily_metrics")
    op.drop_table("daily_metrics")
    op.drop_table("oauth_tokens")
    op.drop_table("brand_accounts")
    op.drop_table("brands")
    op.drop_table("users")
    op.drop_table("tenants")
