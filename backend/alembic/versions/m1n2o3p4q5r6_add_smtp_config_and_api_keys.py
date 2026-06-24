"""add smtp_config and api_keys tables

Revision ID: m1n2o3p4q5r6
Revises: d4e5f6a7b8c9, a7b8c9d0e1f2, b7c8d9e0f1a2
Create Date: 2026-06-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = 'm1n2o3p4q5r6'
down_revision = ('d4e5f6a7b8c9', 'a7b8c9d0e1f2', 'b7c8d9e0f1a2')
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'smtp_config' not in tables:
        op.create_table(
            'smtp_config',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('host', sa.String(255), nullable=False, server_default=''),
            sa.Column('port', sa.Integer(), nullable=False, server_default='587'),
            sa.Column('username', sa.String(255), nullable=False, server_default=''),
            sa.Column('password_enc', sa.String(512), nullable=False, server_default=''),
            sa.Column('from_email', sa.String(255), nullable=False, server_default=''),
            sa.Column('from_name', sa.String(255), nullable=False, server_default=''),
            sa.Column('use_tls', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('is_configured', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    if 'api_keys' not in tables:
        op.create_table(
            'api_keys',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('key_hash', sa.String(128), nullable=False),
            sa.Column('key_prefix', sa.String(8), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('last_used_at', sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    op.drop_table('api_keys')
    op.drop_table('smtp_config')
