from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

from app.core.config import settings
from app.core.database import check_db_connection

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO if settings.is_development else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("honestbill")

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Scheduler ─────────────────────────────────────────────────────────────────
scheduler = AsyncIOScheduler()

# ── Templates ─────────────────────────────────────────────────────────────────
templates = Jinja2Templates(directory="app/templates")


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Verify DB connection
    db_ok = await check_db_connection()
    if not db_ok:
        logger.error("Database connection failed on startup")
        raise RuntimeError("Cannot connect to database")
    logger.info("Database connection OK")

    # Register background jobs
    from app.jobs.network_poller import poll_all_tenants
    from app.jobs.session_expiry import expire_sessions

    scheduler.add_job(
        poll_all_tenants,
        trigger=IntervalTrigger(seconds=settings.NETWORK_POLL_INTERVAL_SECONDS),
        id="network_poller",
        name="Network status poller",
        replace_existing=True,
    )
    scheduler.add_job(
        expire_sessions,
        trigger=IntervalTrigger(seconds=settings.SESSION_EXPIRY_CHECK_INTERVAL_SECONDS),
        id="session_expiry",
        name="Session expiry checker",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Background scheduler started")

    yield

    # ── Shutdown ──
    scheduler.shutdown(wait=False)
    logger.info(f"{settings.APP_NAME} shutdown complete")
    from app.models.isp_invite import ISPInvite  # noqa — registers table


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Hotspot billing SaaS platform",
    docs_url="/docs" if settings.is_development else None,   # hide docs in prod
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.routes import auth, portal, packages, sessions, tenants, mpesa, transactions
from app.api.routes import admin as admin_routes
# Portal preview router removed - using new portal renderer

# ============================================================================
# ROUTER REGISTRATION
# ============================================================================
# Pattern: Each router has prefix="/auth" or "/admin" in its definition
# main.py adds the "/api" prefix when including
# Result: /api/auth/login, /api/admin/invites/generate, etc.
# ============================================================================

app.include_router(auth.router,     prefix="/api", tags=["auth"])
app.include_router(portal.router,   prefix="",                tags=["portal"])
app.include_router(packages.router, prefix="/api", tags=["packages"])
app.include_router(sessions.router, prefix="/api", tags=["sessions"])
app.include_router(tenants.router,  prefix="/api", tags=["tenants"])
app.include_router(mpesa.router,    prefix="/api", tags=["mpesa"])
app.include_router(transactions.router, prefix="/api", tags=["transactions"])
app.include_router(admin_routes.router, prefix="/api", tags=["admin"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    db_ok = await check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "connected" if db_ok else "disconnected",
        "environment": settings.APP_ENV,
    }


@app.get("/", tags=["system"])
async def root():
    return {"message": f"{settings.APP_NAME} API is running"}