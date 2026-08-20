"""add speed_limit_mbps to packages

Revision ID: o1p2q3r4s5t6
Revises: n1o2p3q4r5s6
Create Date: 2026-08-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'o1p2q3r4s5t6'
down_revision = 'n1o2p3q4r5s6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('packages', sa.Column('speed_limit_mbps', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('packages', 'speed_limit_mbps')
