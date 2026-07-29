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
    logger.info("✅ Database connection OK")

    # Auto-run schema migrations for new columns/tables
    from app.db_migrate import run_migrations
    await run_migrations()

    # Register background jobs
    from app.jobs.network_poller import poll_all_tenants
    from app.jobs.session_expiry import expire_sessions
    from app.jobs.subscriber_expiry import process_overdue_subscribers
    from app.jobs.subscriber_reconciliation import reconcile_all_tenants
    from app.jobs.subscriber_usage_poller import poll_subscriber_usage
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

    # Monthly subscriber background jobs
    from apscheduler.triggers.cron import CronTrigger
    scheduler.add_job(
        process_overdue_subscribers,
        trigger=CronTrigger(hour=6, minute=0),
        id="subscriber_expiry",
        name="Monthly subscriber expiry/reminder",
        replace_existing=True,
    )
    scheduler.add_job(
        reconcile_all_tenants,
        trigger=IntervalTrigger(hours=12),
        id="subscriber_reconciliation",
        name="Subscriber router reconciliation",
        replace_existing=True,
    )
    scheduler.add_job(
        poll_subscriber_usage,
        trigger=IntervalTrigger(minutes=10),
        id="subscriber_usage_poller",
        name="Subscriber data usage poller",
        replace_existing=True,
    )

    # Start Invoice Scheduler (Phase 4B)
    try:
        start_invoice_scheduler()
        logger.info("✅ Invoice scheduler initialized")
    except Exception as e:
        logger.warning(f"⚠️  Invoice scheduler init (may already be running): {str(e)}")
    
    scheduler.start()
    logger.info("✅ Background scheduler started")

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
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Unhandled exceptions bypass CORSMiddleware's response-header injection
    (Starlette only adds CORS headers on the way back through a successful
    call_next -- an exception skips that path entirely). Without this, the
    browser reports a misleading "CORS policy" error that hides the real
    500, because the actual error response never carries an
    Access-Control-Allow-Origin header. This handler logs the real error
    and re-adds the header manually so the frontend gets the true status.
    """
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {type(exc).__name__}: {exc}")
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )

# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.routes import auth, portal, packages, sessions, tenants, mpesa, transactions, invoices, mikrotik
from app.api.routes import admin as admin_routes
from app.api.routes import crud_reads
from app.api.routes import vouchers, loyalty, reward_tokens, campaigns
from app.api.routes import admin_feature_flags, admin_audit_log, admin_comms, admin_invoices, payment_notifications
from app.api.routes import subscriber_plans, monthly_subscribers, ipam
from app.api.routes import portal_wizard
from app.api.routes import system, leads
from fastapi.staticfiles import StaticFiles

# ============================================================================
# ROUTER REGISTRATION
# ============================================================================
# Pattern: main.py adds the "/api" prefix for non-portal routers
# invoices router has NO prefix internally, gets /api added here
# Result: /api/invoices, /api/invoices/{id}, /api/invoices/current-status, etc.
# ============================================================================

app.include_router(auth.router,     prefix="/api", tags=["auth"])
app.include_router(portal.router,   prefix="",                tags=["portal"])
app.include_router(packages.router, prefix="/api/packages", tags=["packages"])
app.include_router(sessions.router, prefix="/api", tags=["sessions"])
app.include_router(tenants.router,  prefix="/api", tags=["tenants"])
app.include_router(mpesa.router,    prefix="/api", tags=["mpesa"])
app.include_router(transactions.router, prefix="/api", tags=["transactions"])

# FIXED: Invoice router - prefix="/api" gets added here
app.include_router(invoices.router, prefix="/api", tags=["invoices"])

app.include_router(admin_routes.router, prefix="/api", tags=["admin"])
app.include_router(crud_reads.router, prefix="/api", tags=["crud-reads"])
app.include_router(vouchers.router, prefix="/api/vouchers", tags=["vouchers"])
app.include_router(loyalty.router, prefix="/api/loyalty", tags=["loyalty"])
app.include_router(reward_tokens.router, prefix="/api/reward-tokens", tags=["reward-tokens"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])
app.include_router(admin_feature_flags.router, prefix="/api", tags=["admin-feature-flags"])
app.include_router(admin_audit_log.router, prefix="/api", tags=["admin-audit-log"])
app.include_router(admin_comms.router, prefix="/api", tags=["admin-comms"])
app.include_router(admin_invoices.router, prefix="/api", tags=["admin-invoices"])
app.include_router(mikrotik.router, prefix="/api", tags=["mikrotik"])
app.include_router(payment_notifications.router, prefix="/api", tags=["payment-notifications"])
app.include_router(subscriber_plans.router, prefix="/api/subscriber-plans", tags=["subscriber-plans"])
app.include_router(monthly_subscribers.router, prefix="/api/subscribers", tags=["monthly-subscribers"])
app.include_router(ipam.router, prefix="/api/ipam", tags=["ipam"])
app.include_router(portal_wizard.router, prefix="", tags=["portal-wizard"])
app.include_router(system.router, prefix="/api", tags=["system"])
app.include_router(leads.router, prefix="/api", tags=["leads"])

# Serve uploaded assets
import os
from pathlib import Path
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

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