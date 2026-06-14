"""fix transaction status enum to varchar

Convert transactions.status from native postgres enum to VARCHAR
to match the model's native_enum=False definition. Also convert
existing uppercase enum values to lowercase.

Revision ID: b7c8d9e0f1a2
Revises: a2b3c4d5e6f7
Create Date: 2026-06-14 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    columns = {c['name']: c for c in inspector.get_columns('transactions')}
    status_col = columns.get('status')

    if status_col and isinstance(status_col.get('type'), postgresql.ENUM):
        # Step 1: Alter column from native enum to VARCHAR
        # Postgres implicitly casts enum -> varchar, so data stays uppercase for now
        op.alter_column('transactions', 'status',
                        existing_type=postgresql.ENUM('PENDING', 'SUCCESS', 'FAILED', name='transactionstatus'),
                        type_=sa.String(length=20),
                        existing_nullable=False)
        # Step 2: Now lowercase the data to match model (native_enum=False uses lowercase)
        op.execute("UPDATE transactions SET status = LOWER(status) WHERE status IS NOT NULL")
    else:
        # Already VARCHAR, just make sure data is lowercase (idempotent)
        op.execute("UPDATE transactions SET status = LOWER(status) WHERE status IS NOT NULL")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    columns = {c['name']: c for c in inspector.get_columns('transactions')}
    col_type = columns.get('status', {}).get('type')

    if not isinstance(col_type, postgresql.ENUM):
        # Uppercase data to match enum values, then convert column to native enum
        op.execute("UPDATE transactions SET status = UPPER(status) WHERE status IS NOT NULL")
        op.execute("ALTER TABLE transactions ALTER COLUMN status TYPE transactionstatus USING status::text::transactionstatus")
