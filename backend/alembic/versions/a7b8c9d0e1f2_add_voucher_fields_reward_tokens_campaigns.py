"""Add is_suspended, duration_minutes to vouchers; reward_tokens, campaigns tables

Revision ID: a7b8c9d0e1f2
Revises: a2b3c4d5e6f7
Create Date: 2026-06-15 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "a2b3c4d5e6f7"  # parent: add vouchers and loyalty tables
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Vouchers ──
    op.add_column("vouchers", sa.Column("is_suspended", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("vouchers", sa.Column("duration_minutes", sa.Integer(), nullable=True))
    op.alter_column("vouchers", "package_id", existing_type=UUID(as_uuid=True), nullable=True)

    # ── Campaigns (created first: reward_tokens references campaigns.id) ──
    op.create_table(
        "campaigns",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("campaign_type", sa.String(30), nullable=False),
        sa.Column("reward_minutes", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("expiry_hours", sa.Integer(), nullable=False, server_default=sa.text("12")),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'draft'")),
        sa.Column("target_filter", sa.Text(), nullable=True),
        sa.Column("sent_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("redeemed_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("launched_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_campaigns_tenant_id", "campaigns", ["tenant_id"])

    # ── Reward Tokens ──
    op.create_table(
        "reward_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_code", sa.String(64), nullable=False),
        sa.Column("minutes", sa.Integer(), nullable=False),
        sa.Column("bound_phone", sa.String(20), nullable=True),
        sa.Column("bound_mac", sa.String(17), nullable=True),
        sa.Column("campaign_id", UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reason", sa.String(100), nullable=True),
        sa.Column("redeemed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("redeemed_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_reward_tokens_tenant_id", "reward_tokens", ["tenant_id"])
    op.create_index("ix_reward_tokens_token_code", "reward_tokens", ["token_code"], unique=True)


def downgrade() -> None:
    op.drop_table("reward_tokens")
    op.drop_table("campaigns")
    op.drop_column("vouchers", "is_suspended")
    op.drop_column("vouchers", "duration_minutes")
