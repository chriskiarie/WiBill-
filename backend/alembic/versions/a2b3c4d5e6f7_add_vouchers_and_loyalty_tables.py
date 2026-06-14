"""add vouchers and loyalty tables

Revision ID: a2b3c4d5e6f7
Revises: g1h2i3j4k5l6
Create Date: 2026-06-14 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = 'a2b3c4d5e6f7'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Vouchers table
    op.create_table(
        'vouchers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('package_id', UUID(as_uuid=True), sa.ForeignKey('packages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code', sa.String(20), nullable=False, index=True),
        sa.Column('batch_id', sa.String(36), nullable=True, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='unused'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('expires_at', sa.DateTime, nullable=True),
        sa.Column('used_at', sa.DateTime, nullable=True),
        sa.Column('session_id', UUID(as_uuid=True), sa.ForeignKey('sessions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('mac_address', sa.String(17), nullable=True),
        sa.Column('redeemed_by', sa.String(50), nullable=True),
    )

    # Loyalty accounts table
    op.create_table(
        'loyalty_accounts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('phone_number', sa.String(20), nullable=False),
        sa.Column('points_balance', sa.Integer, nullable=False, server_default='0'),
        sa.Column('total_points_earned', sa.Integer, nullable=False, server_default='0'),
        sa.Column('total_redeemed', sa.Integer, nullable=False, server_default='0'),
        sa.Column('total_spent_ksh', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('lifetime_sessions', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('last_activity_at', sa.DateTime, nullable=True),
    )

    # Loyalty transactions table
    op.create_table(
        'loyalty_transactions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('account_id', UUID(as_uuid=True), sa.ForeignKey('loyalty_accounts.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('type', sa.String(10), nullable=False),
        sa.Column('points', sa.Integer, nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('session_id', UUID(as_uuid=True), sa.ForeignKey('sessions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

    # Add unique constraint for tenant + phone on loyalty_accounts
    op.create_unique_constraint('uq_loyalty_tenant_phone', 'loyalty_accounts', ['tenant_id', 'phone_number'])

    # Add unique constraint for tenant + code on vouchers
    op.create_unique_constraint('uq_voucher_tenant_code', 'vouchers', ['tenant_id', 'code'])


def downgrade() -> None:
    op.drop_constraint('uq_voucher_tenant_code', 'vouchers')
    op.drop_constraint('uq_loyalty_tenant_phone', 'loyalty_accounts')
    op.drop_table('loyalty_transactions')
    op.drop_table('loyalty_accounts')
    op.drop_table('vouchers')
