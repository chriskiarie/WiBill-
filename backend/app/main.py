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

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO if settings.is_development else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("honestbill")

# ── Rate limiter ───────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Scheduler ──────────────────────────────────────────────────────────────────
scheduler = AsyncIOScheduler()

# ── Templates ──────────────────────────────────────────────────────────────────
templates = Jinja2Templates(directory="app/templates")


# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    db_ok = await check_db_connection()
    if not db_ok:
        logger.error("Database connection failed on startup")
        raise RuntimeError("Cannot connect to database")
    logger.info("✅ Database connection OK")

    from app.jobs.network_poller import poll_all_tenants
    from app.jobs.session_expiry import expire_sessions
    from app.jobs.invoice_scheduler import start_scheduler as start_invoice_scheduler

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

    try:
        start_invoice_scheduler()
        logger.info("✅ Invoice scheduler initialized")
    except Exception as e:
        logger.warning(f"⚠️  Invoice scheduler init (may already be running): {str(e)}")

    scheduler.start()
    logger.info("✅ Background scheduler started")

    yield

    scheduler.shutdown(wait=False)
    logger.info(f"{settings.APP_NAME} shutdown complete")
    from app.models.isp_invite import ISPInvite  # noqa


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Hotspot billing SaaS platform",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Rules:
# 1. allow_credentials=True is INCOMPATIBLE with allow_origins=["*"] — browsers block it
# 2. We use Bearer tokens (Authorization header), NOT cookies
#    → allow_credentials=False is correct and sufficient
# 3. With credentials=False, allow_origins=["*"] works perfectly for all origins
#
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Safe because credentials=False (Bearer token auth)
    allow_credentials=False,  # We use Authorization header, not cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Rate limiter ───────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.routes import auth, portal, packages, sessions, tenants, mpesa, transactions, invoices
from app.api.routes import admin as admin_routes
from app.api.routes import crud_reads

app.include_router(auth.router,         prefix="/api",          tags=["auth"])
app.include_router(portal.router,       prefix="",              tags=["portal"])
app.include_router(packages.router,     prefix="/api/packages", tags=["packages"])
app.include_router(sessions.router,     prefix="/api",          tags=["sessions"])
app.include_router(tenants.router,      prefix="/api",          tags=["tenants"])
app.include_router(mpesa.router,        prefix="/api",          tags=["mpesa"])
app.include_router(transactions.router, prefix="/api",          tags=["transactions"])
app.include_router(invoices.router,     prefix="/api",          tags=["invoices"])
app.include_router(admin_routes.router, prefix="/api/admin",    tags=["admin"])
app.include_router(crud_reads.router,   prefix="/api",          tags=["crud-reads"])


# ── Health check ───────────────────────────────────────────────────────────────
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