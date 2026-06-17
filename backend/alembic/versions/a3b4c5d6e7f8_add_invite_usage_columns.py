"""add used_by_tenant_id, used_by_tenant_name, used_at to isp_invites

Revision ID: a3b4c5d6e7f8
Revises: g1h2i3j4k5l6
Create Date: 2026-06-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'a3b4c5d6e7f8'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('isp_invites')]
    if 'used_by_tenant_id' not in columns:
        op.add_column('isp_invites', sa.Column('used_by_tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id'), nullable=True))
    if 'used_by_tenant_name' not in columns:
        op.add_column('isp_invites', sa.Column('used_by_tenant_name', sa.Text(), nullable=True))
    if 'used_at' not in columns:
        op.add_column('isp_invites', sa.Column('used_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('isp_invites', 'used_at')
    op.drop_column('isp_invites', 'used_by_tenant_name')
    op.drop_column('isp_invites', 'used_by_tenant_id')
