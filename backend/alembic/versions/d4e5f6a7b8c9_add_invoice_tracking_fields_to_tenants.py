"""add invoice tracking fields to tenants

Revision ID: d4e5f6a7b8c9
Revises: a3b4c5d6e7f8
Create Date: 2026-06-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'd4e5f6a7b8c9'
down_revision = 'a3b4c5d6e7f8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('tenants')]
    if 'invoice_status' not in columns:
        op.add_column('tenants', sa.Column('invoice_status', sa.String(20), nullable=False, server_default='active'))
    if 'monthly_fee_ksh' not in columns:
        op.add_column('tenants', sa.Column('monthly_fee_ksh', sa.Numeric(12, 2), nullable=True))
    if 'next_invoice_date' not in columns:
        op.add_column('tenants', sa.Column('next_invoice_date', sa.DateTime(timezone=True), nullable=True))
    if 'last_paid_date' not in columns:
        op.add_column('tenants', sa.Column('last_paid_date', sa.DateTime(timezone=True), nullable=True))
    if 'avg_days_punctual' not in columns:
        op.add_column('tenants', sa.Column('avg_days_punctual', sa.Numeric(5, 1), nullable=True))


def downgrade() -> None:
    op.drop_column('tenants', 'avg_days_punctual')
    op.drop_column('tenants', 'last_paid_date')
    op.drop_column('tenants', 'next_invoice_date')
    op.drop_column('tenants', 'monthly_fee_ksh')
    op.drop_column('tenants', 'invoice_status')
