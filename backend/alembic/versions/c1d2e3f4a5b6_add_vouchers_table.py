"""add vouchers table

Revision ID: c1d2e3f4a5b6
Revises: 70fa724590f1
Create Date: 2026-05-31 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = '70fa724590f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


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
            sa.Column('session_id', UUID(as_uuid=True), sa.ForeignKey('sessions.id', ondelete='SET NULL'), nullable=True),
            sa.Column('code', sa.String(20), nullable=False, unique=True),
            sa.Column('note', sa.Text(), nullable=True),
            sa.Column('batch_id', sa.String(36), nullable=True, index=True),
            sa.Column('duration_hours', sa.Integer(), nullable=False),
            sa.Column('price_ksh', sa.Numeric(10, 2), nullable=False),
            sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('redeemed_by_mac', sa.String(17), nullable=True),
            sa.Column('redeemed_by_phone', sa.String(20), nullable=True),
            sa.Column('redeemed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index('ix_vouchers_tenant_id', 'vouchers', ['tenant_id'])
        op.create_index('ix_vouchers_code', 'vouchers', ['code'])
        op.create_index('ix_vouchers_is_used', 'vouchers', ['is_used'])
        op.create_index('ix_vouchers_batch_id', 'vouchers', ['batch_id'])


def downgrade() -> None:
    op.drop_index('ix_vouchers_batch_id', table_name='vouchers')
    op.drop_index('ix_vouchers_is_used', table_name='vouchers')
    op.drop_index('ix_vouchers_code', table_name='vouchers')
    op.drop_index('ix_vouchers_tenant_id', table_name='vouchers')
    op.drop_table('vouchers')
