"""add vouchers and loyalty tables

Revision ID: a2b3c4d5e6f7
Revises: g1h2i3j4k5l6
Create Date: 2026-06-14 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = 'a2b3c4d5e6f7'
down_revision = '006_add_username'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'vouchers' not in tables:
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
    else:
        columns = [c['name'] for c in inspector.get_columns('vouchers')]
        if 'status' not in columns:
            op.add_column('vouchers', sa.Column('status', sa.String(20), nullable=False, server_default='unused'))
        if 'used_at' not in columns:
            op.add_column('vouchers', sa.Column('used_at', sa.DateTime, nullable=True))
        if 'mac_address' not in columns:
            op.add_column('vouchers', sa.Column('mac_address', sa.String(17), nullable=True))
        if 'redeemed_by' not in columns:
            op.add_column('vouchers', sa.Column('redeemed_by', sa.String(50), nullable=True))

    if 'loyalty_accounts' not in tables:
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

    if 'loyalty_transactions' not in tables:
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

    constraint_names = [c['name'] for c in inspector.get_unique_constraints('loyalty_accounts')]
    if 'uq_loyalty_tenant_phone' not in constraint_names:
        op.create_unique_constraint('uq_loyalty_tenant_phone', 'loyalty_accounts', ['tenant_id', 'phone_number'])

    v_constraint_names = [c['name'] for c in inspector.get_unique_constraints('vouchers')]
    if 'uq_voucher_tenant_code' not in v_constraint_names and 'vouchers_code_key' not in v_constraint_names:
        op.create_unique_constraint('uq_voucher_tenant_code', 'vouchers', ['tenant_id', 'code'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    constraint_names = [c['name'] for c in inspector.get_unique_constraints('vouchers')]
    if 'uq_voucher_tenant_code' in constraint_names:
        op.drop_constraint('uq_voucher_tenant_code', 'vouchers')
    constraint_names = [c['name'] for c in inspector.get_unique_constraints('loyalty_accounts')]
    if 'uq_loyalty_tenant_phone' in constraint_names:
        op.drop_constraint('uq_loyalty_tenant_phone', 'loyalty_accounts')
    tables = inspector.get_table_names()
    if 'loyalty_transactions' in tables:
        op.drop_table('loyalty_transactions')
    if 'loyalty_accounts' in tables:
        op.drop_table('loyalty_accounts')
    if 'vouchers' in tables:
        op.drop_table('vouchers')
