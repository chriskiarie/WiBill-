"""add tunnel_hostname column

Revision ID: b1c2d3e4f5a6
Revises: a4b5c6d7e8f9
Create Date: 2026-07-29
"""
from alembic import op
import sqlalchemy as sa

revision = 'b1c2d3e4f5a6'
down_revision = 'a4b5c6d7e8f9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('mikrotik_configs', sa.Column('tunnel_hostname', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('mikrotik_configs', 'tunnel_hostname')
