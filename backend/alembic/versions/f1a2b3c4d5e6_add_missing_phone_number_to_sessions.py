"""add missing phone_number column to sessions

Revision ID: f1a2b3c4d5e6
Revises: b1c2d3e4f5a6
Create Date: 2026-08-05 01:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('sessions')]
    if 'phone_number' not in columns:
        op.add_column('sessions', sa.Column('phone_number', sa.String(length=20), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('sessions')]
    if 'phone_number' in columns:
        op.drop_column('sessions', 'phone_number')
