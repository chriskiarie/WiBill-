"""add bridge_secret_enc, tunnel_token_enc, tunnel_id to mikrotik_configs

Revision ID: a4b5c6d7e8f9
Revises: m1n2o3p4q5r6
Create Date: 2026-07-03 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision = 'a4b5c6d7e8f9'
down_revision = 'm1n2o3p4q5r6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('mikrotik_configs', sa.Column('bridge_secret_enc', sa.Text(), nullable=True))
    op.add_column('mikrotik_configs', sa.Column('tunnel_token_enc', sa.Text(), nullable=True))
    op.add_column('mikrotik_configs', sa.Column('tunnel_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('mikrotik_configs', 'tunnel_id')
    op.drop_column('mikrotik_configs', 'tunnel_token_enc')
    op.drop_column('mikrotik_configs', 'bridge_secret_enc')
