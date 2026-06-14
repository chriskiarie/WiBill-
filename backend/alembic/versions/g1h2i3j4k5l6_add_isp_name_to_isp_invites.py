"""add isp_name to isp_invites

Revision ID: g1h2i3j4k5l6
Revises: f35e47d8c40f_add_portal_config_and_onboarding_flag
Create Date: 2026-06-10 08:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g1h2i3j4k5l6'
down_revision = '70fa724590f1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('isp_invites')]
    if 'isp_name' not in columns:
        op.add_column('isp_invites', sa.Column('isp_name', sa.String(255), nullable=True))


def downgrade() -> None:
    # Remove isp_name column on rollback
    op.drop_column('isp_invites', 'isp_name')