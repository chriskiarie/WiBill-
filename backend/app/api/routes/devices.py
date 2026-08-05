from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.client_device import ClientDevice
from app.models.session import Session, SessionStatus
from app.services.mikrotik_service import add_hotspot_bypass

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────

class DeviceLookupResponse(BaseModel):
    known: bool
    status: str  # "active" | "expired" | "unknown"
    phone_prefill: Optional[str] = None
    expires_at: Optional[datetime] = None


class DeviceAuthRequest(BaseModel):
    mac: str
    router_id: Optional[str] = None
    phone: Optional[str] = None
    ip: Optional[str] = None


class DeviceAuthResponse(BaseModel):
    ok: bool
    device_status: str
    message: str


# ── GET /api/portal/{slug}/device-lookup ─────────────────────────────────

@router.get("/portal/{tenant_slug}/device-lookup", response_model=DeviceLookupResponse, tags=["portal-devices"])
async def device_lookup(
    tenant_slug: str,
    mac: str = Query(..., description="MAC address of the client device"),
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: look up a device by MAC address.
    Returns known status, phone prefill, and session expiry if active.
    Used by the portal to skip re-asking for phone number on returning devices.
    """
    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="ISP not found")

    mac_normalized = mac.strip().upper()

    # Check client_devices table first
    dev_result = await db.execute(
        select(ClientDevice).where(
            ClientDevice.tenant_id == tenant.id,
            ClientDevice.mac_address == mac_normalized,
        )
    )
    device = dev_result.scalar_one_or_none()

    if device:
        # Check if there's an active session for this MAC
        session_result = await db.execute(
            select(Session).where(
                Session.tenant_id == tenant.id,
                Session.mac_address == mac_normalized,
                Session.status == SessionStatus.ACTIVE,
            ).order_by(Session.created_at.desc()).limit(1)
        )
        active_session = session_result.scalar_one_or_none()

        if active_session and active_session.expires_at:
            if active_session.expires_at > datetime.now(timezone.utc):
                return DeviceLookupResponse(
                    known=True,
                    status="active",
                    phone_prefill=device.customer_phone,
                    expires_at=active_session.expires_at,
                )

        # Device known but no active session
        return DeviceLookupResponse(
            known=True,
            status="expired" if device.plan_expires_at and device.plan_expires_at < datetime.now(timezone.utc) else "unknown",
            phone_prefill=device.customer_phone,
            expires_at=device.plan_expires_at,
        )

    # Device not known
    return DeviceLookupResponse(
        known=False,
        status="unknown",
        phone_prefill=None,
        expires_at=None,
    )


# ── POST /api/portal/{slug}/device-auth ──────────────────────────────────

@router.post("/portal/{tenant_slug}/device-auth", response_model=DeviceAuthResponse, tags=["portal-devices"])
async def device_auth(
    tenant_slug: str,
    body: DeviceAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: authenticate a device by MAC address.
    Upserts ClientDevice record and (once MikroTik integration is real)
    pushes an ip-binding bypass entry on the router.
    """
    result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="ISP not found")

    mac_normalized = body.mac.strip().upper()
    now = datetime.now(timezone.utc)

    # Upsert client device
    dev_result = await db.execute(
        select(ClientDevice).where(
            ClientDevice.tenant_id == tenant.id,
            ClientDevice.mac_address == mac_normalized,
        )
    )
    device = dev_result.scalar_one_or_none()

    if device:
        device.last_seen_at = now
        if body.phone:
            device.customer_phone = body.phone
        if body.ip:
            device.last_ip = body.ip
        if body.router_id:
            device.last_router_id = body.router_id
    else:
        device = ClientDevice(
            tenant_id=tenant.id,
            mac_address=mac_normalized,
            customer_phone=body.phone,
            last_router_id=body.router_id,
            last_ip=body.ip,
            first_seen_at=now,
            last_seen_at=now,
            status="active",
        )
        db.add(device)

    await db.flush()

    # Push ip-binding bypass entry on router for returning devices
    if body.ip and body.router_id:
        try:
            await add_hotspot_bypass(
                tenant_id=str(tenant.id),
                mac_address=mac_normalized,
                ip_address=body.ip,
                expires_at=device.plan_expires_at,
                db=db,
            )
        except Exception:
            pass  # Non-critical — device is registered in DB regardless

    return DeviceAuthResponse(
        ok=True,
        device_status=device.status,
        message="Device registered" if not device.customer_phone else "Device updated",
    )
