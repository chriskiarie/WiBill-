import os
from logging.config import fileConfig
from sqlalchemy import pool, create_engine
from sqlalchemy.engine import Connection
from alembic import context

# ── Alembic Config object ─────────────────────────────────────────────────────
config = context.config

# ── Database URL ──────────────────────────────────────────────────────────────
# Use DATABASE_URL from environment (Railway injects this).
# Railway provides postgresql:// — we use sync driver for Alembic.
db_url = os.environ.get("DATABASE_URL", "")
# Strip async driver suffix if present (e.g. postgresql+asyncpg:// → postgresql://)
if "+asyncpg" in db_url:
    db_url = db_url.replace("+asyncpg", "")

config.set_main_option("sqlalchemy.url", db_url)

# ── Logging ───────────────────────────────────────────────────────────────────
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import Base and ALL models so Alembic can detect them ─────────────────────
from app.core.database import Base  # noqa: E402
from app.models.invoice import Invoice  # noqa: E402
from app.models.invoice_transaction import InvoiceTransaction  # noqa: E402
from app.models.invoice_reminder import InvoiceReminder  # noqa: E402
from app.models import (  # noqa: E402
    Tenant,
    AdminUser,
    Package,
    Session,
    Transaction,
    NetworkEvent,
    MpesaConfig,
    MikrotikConfig,
    MpesaCallback,
    Voucher,
    LoyaltyAccount,
    LoyaltyTransaction,
)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = config.get_main_option("sqlalchemy.url")
    connectable = create_engine(url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        do_run_migrations(connection)
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()