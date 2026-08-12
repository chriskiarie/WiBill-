"""
onboard.py — Remote device onboarding flow.

ISP generates a short-lived token → pastes a one-liner into the router's terminal.
The router fetches a .rsc script from /onboard/{token}, which registers itself back.
Backend pushes config only after the router reports in.
"""
import secrets
import json
import logging
from datetime import datetime, timedelta, timezone as tz
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.mikrotik_config import MikrotikConfig
from app.models.onboarding_token import OnboardingToken
from app.services.crypto_service import encrypt, decrypt
from app.services.router_poll_service import ensure_poll_token

logger = logging.getLogger("wibill.onboard")

router = APIRouter()

ONBOARD_TOKEN_EXPIRY_MINUTES = 30


class OnboardGeneratePayload(BaseModel):
    ros_version: str  # "6" or "7"


class OnboardRegisterPayload(BaseModel):
    ros_version: str
    board: str
    mac: str
    existing_hotspot: bool


# ── Token generation (authenticated — ISP admin) ────────────────────────────
@router.post("/onboard/generate")
async def generate_onboard_token(
    payload: OnboardGeneratePayload,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Generate a short-lived onboarding token for a new device."""
    if payload.ros_version not in ("6", "7"):
        raise HTTPException(status_code=400, detail="ros_version must be '6' or '7'")

    tenant = await db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Invalidate any pending tokens for this tenant
    result = await db.execute(
        select(OnboardingToken).where(
            OnboardingToken.tenant_id == current_user.tenant_id,
            OnboardingToken.status == "pending",
        )
    )
    for old_token in result.scalars().all():
        old_token.status = "expired"

    token_value = secrets.token_urlsafe(32)
    now = datetime.now(tz.utc)
    onboard_token = OnboardingToken(
        token=token_value,
        tenant_id=current_user.tenant_id,
        ros_version=payload.ros_version,
        status="pending",
        expires_at=now + timedelta(minutes=ONBOARD_TOKEN_EXPIRY_MINUTES),
    )
    db.add(onboard_token)
    await db.commit()

    # Build the one-liner command appropriate for the declared RouterOS version
    onboard_base = settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL
    fetch_url = f"{onboard_base}/onboard/{token_value}"

    if payload.ros_version == "7":
        command = (
            f'/tool fetch url="{fetch_url}" http-method=get dst-path=wibill.rsc\n'
            f"/import wibill.rsc"
        )
    else:
        command = (
            f'/tool fetch url="{fetch_url}" mode=https dst-path=wibill.rsc\n'
            f"/import wibill.rsc"
        )

    return {
        "ok": True,
        "token": token_value,
        "ros_version": payload.ros_version,
        "expires_at": onboard_token.expires_at.isoformat(),
        "command": command,
        "fetch_url": fetch_url,
        "note": "Paste this into your router's terminal - Winbox, SSH, or Webfig all work.",
    }


# ── Script serving (public — router calls this) ─────────────────────────────
@router.get("/onboard/{token}")
async def serve_onboard_script(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Serve a per-request .rsc script to the router.
    The script reads router identity, then POSTs back to /onboard/{token}/register.
    """
    result = await db.execute(
        select(OnboardingToken).where(OnboardingToken.token == token)
    )
    onboard = result.scalar_one_or_none()

    if not onboard:
        raise HTTPException(status_code=404, detail="Invalid onboarding token")

    if onboard.status != "pending":
        raise HTTPException(
            status_code=410,
            detail="This token has already been used or expired. Generate a new one from the dashboard.",
        )

    if onboard.expires_at.replace(tzinfo=tz.utc) < datetime.now(tz.utc):
        onboard.status = "expired"
        await db.commit()
        raise HTTPException(
            status_code=410,
            detail="This token has expired. Generate a new one from the dashboard.",
        )

    tenant = await db.get(Tenant, onboard.tenant_id)
    tenant_name = tenant.name if tenant else "WiBill ISP"
    onboard_base = settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL
    register_url = f"{onboard_base}/onboard/{token}/register"

    # Build the .rsc script — tailored to the declared RouterOS version
    # The script:
    #   1. Reads router identity (version, board, MAC)
    #   2. Detects existing hotspot config
    #   3. POSTs the registration payload back to the backend
    if onboard.ros_version == "7":
        # RouterOS 7.x uses /tool fetch with http-method
        script = f"""/tool fetch url="{register_url}" http-method=post \\
    http-data="ros_version={{[/system resource get version]}}&board={{[/system resource get board-name]}}&mac={{[/interface get [find default] mac-address]}}&existing_hotspot={{[:if ({{len [/ip hotspot find]}} > 0) do={{\"true\"}} else={{\"false\"}}]}}" \\
    as-value output=user
:log info "WiBill onboarding registration sent for {tenant_name}"
"""
    else:
        # RouterOS 6.x uses /tool fetch with mode=https and different quoting
        script = f"""/tool fetch url="{register_url}" mode=https \\
    http-method=post \\
    http-data="ros_version={{[/system resource get version]}}&board={{[/system resource get board-name]}}&mac={{[/interface get [find default] mac-address]}}&existing_hotspot={{[:if ({{len [/ip hotspot find]}} > 0) do={{\"true\"}} else={{\"false\"}}]}}" \\
    as-value output=user
:log info "WiBill onboarding registration sent for {tenant_name}"
"""

    return PlainTextResponse(
        content=script,
        media_type="text/plain",
        headers={"Content-Type": "text/plain; charset=utf-8"},
    )


# ── Registration endpoint (public — router POSTs back) ──────────────────────
@router.post("/onboard/{token}/register")
async def register_device(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Router calls this after fetching the .rsc script.
    Expects form-encoded data: ros_version, board, mac, existing_hotspot.
    """
    result = await db.execute(
        select(OnboardingToken).where(OnboardingToken.token == token)
    )
    onboard = result.scalar_one_or_none()

    if not onboard:
        return PlainTextResponse("error: invalid token", status_code=404)

    if onboard.status != "pending":
        return PlainTextResponse("error: token already used or expired", status_code=410)

    if onboard.expires_at.replace(tzinfo=tz.utc) < datetime.now(tz.utc):
        onboard.status = "expired"
        await db.commit()
        return PlainTextResponse("error: token expired", status_code=410)

    # Parse form data (router sends form-encoded)
    try:
        content_type = request.headers.get("content-type", "")
        if "form" in content_type or "urlencoded" in content_type:
            form = await request.form()
            ros_version = form.get("ros_version", "")
            board = form.get("board", "")
            mac = form.get("mac", "")
            existing_hotspot = form.get("existing_hotspot", "false") == "true"
        else:
            body = await request.json()
            ros_version = body.get("ros_version", "")
            board = body.get("board", "")
            mac = body.get("mac", "")
            existing_hotspot = body.get("existing_hotspot", False)
    except Exception:
        return PlainTextResponse("error: could not parse registration data", status_code=400)

    # Clean up RouterOS version string (may include extra text like "6.49.18")
    ros_version_clean = ros_version.strip().split(".")[0] if ros_version else onboard.ros_version

    # Store registration data on the token
    onboard.registration_data = json.dumps({
        "ros_version": ros_version,
        "ros_version_major": ros_version_clean,
        "board": board,
        "mac": mac,
        "existing_hotspot": existing_hotspot,
    })
    onboard.used_at = datetime.now(tz.utc)
    onboard.status = "used"

    # Find or create MikrotikConfig for this tenant
    config_result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == onboard.tenant_id)
    )
    config = config_result.scalar_one_or_none()

    if config:
        # Update existing config with detected info
        config.status = "ONBOARDING"
        config.notes = f"Board: {board} | RouterOS: {ros_version} | MAC: {mac}"
        onboard.router_id = config.id
    else:
        # Create a minimal config — full setup happens via the wizard
        import uuid as _uuid
        config = MikrotikConfig(
            id=_uuid.uuid4(),
            tenant_id=onboard.tenant_id,
            router_ip="192.168.4.1",
            api_port=8728,
            api_username="wibill-api",
            api_password_enc=encrypt(secrets.token_urlsafe(16)),
            hotspot_server="hotspot1",
            status="ONBOARDING",
            notes=f"Board: {board} | RouterOS: {ros_version} | MAC: {mac}",
        )
        db.add(config)
        await db.flush()
        onboard.router_id = config.id

    # Generate the per-router poll token at registration time (Section 5 of
    # the polling redesign). It's written into the router's scheduler config
    # when the onboarding .rsc is applied.
    ensure_poll_token(config)

    await db.commit()

    logger.info(
        f"Device registered for tenant {onboard.tenant_id}: "
        f"board={board}, ros={ros_version}, mac={mac}, existing_hotspot={existing_hotspot}"
    )

    return PlainTextResponse(
        content="ok: registered",
        status_code=200,
    )


# ── Get current onboarding status (authenticated — ISP admin polls) ─────────
@router.get("/onboard/status")
async def get_onboarding_status(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Return the current pending/completed onboarding token for this tenant."""
    result = await db.execute(
        select(OnboardingToken).where(
            OnboardingToken.tenant_id == current_user.tenant_id,
        ).order_by(OnboardingToken.created_at.desc())
    )
    tokens = result.scalars().all()

    if not tokens:
        return {"status": "none", "token": None}

    latest = tokens[0]
    return {
        "status": latest.status,
        "token": latest.token,
        "ros_version": latest.ros_version,
        "created_at": latest.created_at.isoformat() if latest.created_at else None,
        "expires_at": latest.expires_at.isoformat() if latest.expires_at else None,
        "used_at": latest.used_at.isoformat() if latest.used_at else None,
        "registration_data": json.loads(latest.registration_data) if latest.registration_data else None,
    }


# ── Conflict resolution: confirm overwrite or skip hotspot ───────────────────
class ConflictResolutionPayload(BaseModel):
    token: str
    overwrite_hotspot: bool  # True = push new config, False = skip hotspot setup


@router.post("/onboard/resolve-conflict")
async def resolve_hotspot_conflict(
    payload: ConflictResolutionPayload,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """
    Called from the dashboard after the ISP confirms whether to overwrite
    an existing hotspot config that was detected during registration.
    """
    result = await db.execute(
        select(OnboardingToken).where(
            OnboardingToken.token == payload.token,
            OnboardingToken.tenant_id == current_user.tenant_id,
        )
    )
    onboard = result.scalar_one_or_none()
    if not onboard:
        raise HTTPException(status_code=404, detail="Token not found")
    if onboard.status != "used":
        raise HTTPException(status_code=400, detail="Token is not in 'used' state")

    reg_data = json.loads(onboard.registration_data) if onboard.registration_data else {}
    config_result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    config = config_result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="No MikroTik config found")

    if payload.overwrite_hotspot:
        # Mark config as ready for the full setup wizard to proceed
        config.status = "PROVISIONED"
        config.notes = (config.notes or "") + " | Overwrite hotspot: confirmed"
    else:
        # Keep existing hotspot, just register the device
        config.status = "CONNECTED"
        config.notes = (config.notes or "") + " | Keep existing hotspot: confirmed"

    await db.commit()

    return {
        "ok": True,
        "overwrite": payload.overwrite_hotspot,
        "status": config.status,
    }

    
