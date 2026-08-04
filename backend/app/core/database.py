import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

logger = logging.getLogger("honestbill")


# ── Ensure async driver scheme ─────────────────────────────────────────────
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# ── Ensure async driver scheme ─────────────────────────────────────────────
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    _db_url,
    echo=settings.is_development,   # logs SQL in dev, silent in prod
    pool_pre_ping=True,             # verify connection before use
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600,              # recycle connections hourly to prevent staleness
    pool_timeout=10,                # fail fast (10s) instead of hanging 30s
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,         # keep objects usable after commit
    autoflush=False,
    autocommit=False,
)

# ── Base model ────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency — use this in every FastAPI route ──────────────────────────────
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Health check ──────────────────────────────────────────────────────────────
async def check_db_connection() -> bool:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        # Log full details -- this was what was previously swallowed, making
        # "Cannot connect to database" undebuggable from Railway logs alone.
        logger.error(
            f"DB connection check failed: {type(e).__name__}: {e}. "
            f"URL host being used: {_db_url.split('@')[-1].split('/')[0] if '@' in _db_url else '(unparseable)'}"
        )
        return False