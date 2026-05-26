from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings


# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.is_development,   # logs SQL in dev, silent in prod
    pool_pre_ping=True,             # verify connection before use
    pool_size=10,
    max_overflow=20,
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
    except Exception:
        return False