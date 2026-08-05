import asyncio
from logging.config import fileConfig
from sqlalchemy import pool, create_engine
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Import settings and Base
from app.core.config import settings
from app.core.database import Base

# Import ALL models so Alembic can detect them
from app.models import (
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
    OutageEvent,
    RouterHealthCheck,
    ClientDevice,
)

# Import invoice models (may fail if table doesn't exist yet)
try:
    from app.models.invoice import Invoice
    from app.models.invoice_transaction import InvoiceTransaction
    from app.models.invoice_reminder import InvoiceReminder
except Exception:
    pass

# Alembic Config object
config = context.config

# Set the database URL from our settings (overrides alembic.ini)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata for autogenerate
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


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    url = settings.DATABASE_URL
    if "+asyncpg" in url:
        asyncio.run(run_async_migrations())
    else:
        connectable = create_engine(url, poolclass=pool.NullPool)
        with connectable.connect() as connection:
            do_run_migrations(connection)
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()