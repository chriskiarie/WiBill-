"""add username to admin_users

Revision ID: 006_add_username
Revises: 005
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_add_username'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add username column (nullable initially, then we'll set values, then make NOT NULL)
    op.add_column('admin_users', sa.Column('username', sa.String(50), nullable=True, unique=True))


def downgrade() -> None:
    op.drop_column('admin_users', 'username')
