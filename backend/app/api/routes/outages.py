from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.outage_event import OutageEvent
from app.models.mikrotik_config import MikrotikConfig

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────

class OutageCreate(BaseModel):
    status: str = "investigating"  # investigating | confirmed_down | degraded
    description: Optional[str] = None
    eta: Optional[datetime] = None
    zone: Optional[str] = None
    router_id: Optional[str] = None  # UUID as string


class OutageResolve(BaseModel):
    description: Optional[str] = None


class OutageResponse(BaseModel):
    id: str
    tenant_id: str
    router_id: Optional[str]
    zone: Optional[str]
    source: str
    status: str
    started_at: datetime
    resolved_at: Optional[datetime]
    eta: Optional[datetime]
    description: Optional[str]
    created_by_id: Optional[str]

    class Config:
        from_attributes = True


class PortalStatusResponse(BaseModel):
    status: str  # "operational" | "investigating" | "confirmed_down" | "degraded"
    source: Optional[str]  # "manual" | "auto"
    since: Optional[datetime]
    eta: Optional[datetime]
    description: Optional[str]


# ── Helper: resolve current outage status ────────────────────────────────

async def resolve_current_outage(db: AsyncSession, tenant_id, router_id=None):
    """Return the most relevant unresolved outage for a tenant.

    Priority: manual events always win over auto events.
    """
    filters = [
        OutageEvent.tenant_id == tenant_id,
        OutageEvent.resolved_at.is_(None),
    ]
    if router_id:
        filters.append(OutageEvent.router_id == router_id)

    # Check manual first
    manual = await db.execute(
        select(OutageEvent)
        .where(*filters, OutageEvent.source == "manual")
        .order_by(OutageEvent.started_at.desc())
        .limit(1)
    )
    manual_event = manual.scalar_one_or_none()
    if manual_event:
        return manual_event

    # Then auto
    auto = await db.execute(
        select(OutageEvent)
        .where(*filters, OutageEvent.source == "auto")
        .order_by(OutageEvent.started_at.desc())
        .limit(1)
    )
    return auto.scalar_one_or_none()


# ── ISP Staff: Manual outage CRUD ───────────────────────────────────────

@router.post("/isp/outages", response_model=OutageResponse, tags=["outages"])
async def create_outage(
    body: OutageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Staff creates a manual outage event."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="ISP admin must belong to a tenant")

    outage = OutageEvent(
        tenant_id=tenant_id,
        router_id=body.router_id,
        zone=body.zone,
        source="manual",
        status=body.status,
        started_at=datetime.now(timezone.utc),
        description=body.description,
        eta=body.eta,
        created_by_id=current_user.id,
    )
    db.add(outage)
    await db.flush()
    return _outage_to_response(outage)


@router.get("/isp/outages", response_model=list[OutageResponse], tags=["outages"])
async def list_outages(
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Staff lists outage events for their tenant."""
    tenant_id = current_user.tenant_id
    filters = [OutageEvent.tenant_id == tenant_id]
    if status:
        filters.append(OutageEvent.status == status)
    else:
        # Default: show unresolved
        filters.append(OutageEvent.resolved_at.is_(None))

    result = await db.execute(
        select(OutageEvent).where(*filters).order_by(OutageEvent.started_at.desc()).limit(50)
    )
    return [_outage_to_response(o) for o in result.scalars().all()]


@router.patch("/isp/outages/{outage_id}/resolve", response_model=OutageResponse, tags=["outages"])
async def resolve_outage(
    outage_id: str,
    body: OutageResolve,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Staff resolves an outage."""
    tenant_id = current_user.tenant_id
    result = await db.execute(
        select(OutageEvent).where(
            OutageEvent.id == outage_id,
            OutageEvent.tenant_id == tenant_id,
        )
    )
    outage = result.scalar_one_or_none()
    if not outage:
        raise HTTPException(status_code=404, detail="Outage not found")

    outage.status = "resolved"
    outage.resolved_at = datetime.now(timezone.utc)
    if body.description:
        outage.description = body.description

    return _outage_to_response(outage)


# ── Public: Portal status endpoint ───────────────────────────────────────

@router.get("/portal/{tenant_slug}/status", response_model=PortalStatusResponse, tags=["portal-status"])
async def get_portal_status(
    tenant_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: returns current outage status for the portal widget.
    No auth required — this feeds the pre-payment status banner.
    """
    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="ISP not found")

    outage = await resolve_current_outage(db, tenant.id)

    if not outage:
        return PortalStatusResponse(
            status="operational",
            source=None,
            since=None,
            eta=None,
            description=None,
        )

    return PortalStatusResponse(
        status=outage.status,
        source=outage.source,
        since=outage.started_at,
        eta=outage.eta,
        description=outage.description,
    )


# ── Internal: health-check trigger endpoint ──────────────────────────────

@router.post("/internal/health-check/run", tags=["internal"])
async def run_health_check(
    db: AsyncSession = Depends(get_db),
    x_internal_secret: str = Depends(lambda: None),  # TODO: validate shared secret
):
    """Cron-triggered endpoint. Runs health checks for all active routers.
    Protected by shared secret header (X-Internal-Secret).
    """
    from app.jobs.health_check_job import run_health_checks
    await run_health_checks(db)
    return {"ok": True}


def _outage_to_response(outage: OutageEvent) -> OutageResponse:
    return OutageResponse(
        id=str(outage.id),
        tenant_id=str(outage.tenant_id),
        router_id=str(outage.router_id) if outage.router_id else None,
        zone=outage.zone,
        source=outage.source,
        status=outage.status,
        started_at=outage.started_at,
        resolved_at=outage.resolved_at,
        eta=outage.eta,
        description=outage.description,
        created_by_id=str(outage.created_by_id) if outage.created_by_id else None,
    )
