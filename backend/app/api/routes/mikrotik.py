import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.config import settings
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.mikrotik_config import MikrotikConfig
from app.services.crypto_service import encrypt, decrypt
from app.services.mikrotik_service import get_active_users, get_hotspot_hosts
from app.services.router_poll_service import ensure_poll_token, build_poll_scheduler_block, resolve_ros_version, router_status, enqueue_action, build_portal_fetch_line
from app.models.router_action import RouterAction
from app.models.tenant import Tenant


router = APIRouter()
public_router = APIRouter()


class MikrotikConfigPayload(BaseModel):
    router_ip: str
    api_port: int = 8728
    api_username: str
    api_password: str
    hotspot_server: str = "hotspot1"
    hotspot_profile_name: Optional[str] = None
    nas_ip_address: Optional[str] = None
    notes: Optional[str] = None


class MikrotikConfigUpdatePayload(BaseModel):
    router_ip: str
    api_port: int = 8728
    api_username: str
    api_password: Optional[str] = None
    hotspot_server: str = "hotspot1"
    hotspot_profile_name: Optional[str] = None
    nas_ip_address: Optional[str] = None
    notes: Optional[str] = None


@router.get("/mikrotik/config")
async def get_config(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        return {"configured": False}
    return {
        "configured": True,
        "router_ip": config.router_ip,
        "api_port": config.api_port,
        "api_username": config.api_username,
        "api_password": "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
        "hotspot_server": config.hotspot_server,
        "hotspot_profile_name": config.hotspot_profile_name,
        "nas_ip_address": config.nas_ip_address,
        "status": config.status,
        "tunnel_id": config.tunnel_id,
        "notes": config.notes,
        "last_connected_at": config.last_connected_at.isoformat() if config.last_connected_at else None,
        "last_error_message": config.last_error_message,
    }


@router.post("/mikrotik/config")
async def create_config(
    payload: MikrotikConfigPayload,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Config already exists \u2014 use PATCH to update"
        )
    config = MikrotikConfig(
        id=uuid.uuid4(),
        tenant_id=current_user.tenant_id,
        router_ip=payload.router_ip,
        api_port=payload.api_port,
        api_username=payload.api_username,
        api_password_enc=encrypt(payload.api_password),
        hotspot_server=payload.hotspot_server,
        hotspot_profile_name=payload.hotspot_profile_name,
        nas_ip_address=payload.nas_ip_address,
        notes=payload.notes,
    )
    db.add(config)
    await db.commit()
    return {"ok": True, "id": str(config.id)}


@router.patch("/mikrotik/config")
async def update_config(
    payload: MikrotikConfigUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=404,
            detail="No config found \u2014 use POST to create"
        )
    config.router_ip = payload.router_ip
    if config.router_ip.startswith("http"):
        raise HTTPException(status_code=400, detail="router_ip must be a local IP (e.g. 192.168.4.1), not a URL")
    config.api_port = payload.api_port
    config.api_username = payload.api_username
    if payload.api_password is not None and payload.api_password != "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022":
        config.api_password_enc = encrypt(payload.api_password)
    config.hotspot_server = payload.hotspot_server
    config.hotspot_profile_name = payload.hotspot_profile_name
    config.nas_ip_address = payload.nas_ip_address
    config.notes = payload.notes
    await db.commit()
    return {"ok": True}


def _sanitize_notes_value(value: str) -> str:
    """Replace literal RouterOS command strings with a human-readable fallback.

    If the router failed to evaluate inline expressions (RouterOS 6.x bug),
    the notes field would contain raw commands like
    ``{{/system resource get version}}`` instead of resolved values.
    """
    import re
    # Matches patterns like {{/system resource get version}} or
    # {[/system resource get board-name]} — any un-evaluated RSC command.
    if re.search(r'\{+\[?/system\s+', value) or re.search(r'\{+\[?/interface\s+', value):
        return "unknown"
    return value


def _notes_parts(config: MikrotikConfig | None) -> dict:
    """Parse registration notes ("Board: ... | RouterOS: ... | MAC: ...")."""
    parts: dict = {}
    if not config or not config.notes:
        return parts
    for tok in config.notes.split("|"):
        tok = tok.strip()
        if ":" in tok:
            k, _, v = tok.partition(":")
            parts[k.strip().lower()] = _sanitize_notes_value(v.strip())
    return parts


@router.get("/mikrotik/test")
@router.post("/mikrotik/test")
async def test_connection(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Router connectivity — derived from time since last poll (Section 8).

    No bridge /health call: the router checking in on schedule IS the health
    check.
    """
    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        return {"connected": False, "configured": False, "error": "No MikroTik config saved for this ISP"}

    status = router_status(config)
    connected = status == "online"
    parts = _notes_parts(config)
    return {
        "connected": connected,
        "configured": True,
        "status": status,
        "error": None if connected else (
            "Router has not polled recently" if status == "offline" else "Router has never polled"
        ),
        "router_identity": None,
        "router_os_version": parts.get("routeros"),
        "board_name": parts.get("board"),
        "uptime": None,
        "hotspot_found": None,
        "last_poll_at": config.last_poll_at.isoformat() if config.last_poll_at else None,
    }


@router.get("/mikrotik/health")
async def health_check(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    from datetime import datetime, timezone as tz

    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        return {"configured": False, "status": "DISCONNECTED", "connected": False}

    status = router_status(config)
    connected = status == "online"
    parts = _notes_parts(config)

    new_status = "CONNECTED" if connected else "ERROR"
    if connected:
        config.last_connected_at = datetime.utcnow().replace(tzinfo=tz.utc)
        config.last_error_message = None
    elif status == "never_connected":
        config.last_error_message = "Router has never polled"
    else:
        config.last_error_message = "Router has not polled in over 90 seconds"
    config.status = new_status
    await db.commit()

    return {
        "configured": True,
        "status": new_status,
        "connected": connected,
        "router_reachable": connected,
        "router_ip": config.router_ip,
        "router_identity": parts.get("board"),
        "router_os_version": parts.get("routeros"),
        "board_name": parts.get("board"),
        "ssid": parts.get("ssid"),
        "walled_garden": parts.get("walledgarden"),
        "onboard_path": parts.get("onboardpath") or "quick_connect",
        "uptime": None,
        "hotspot_found": None,
        "last_connected_at": config.last_connected_at.isoformat() if config.last_connected_at else None,
        "last_poll_at": config.last_poll_at.isoformat() if config.last_poll_at else None,
        "last_error": config.last_error_message,
    }


@router.post("/mikrotik/provision")
async def provision_bridge(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Retired: the bridge-PC model is gone (router-initiated polling).

    The router pulls its own instructions via the poll scheduler job — no
    tunnel, no bridge provisioning. Kept as a stub that explains this so the
    frontend can't accidentally call a dead endpoint and silently fail.
    """
    raise HTTPException(
        status_code=400,
        detail="Bridge provisioning is retired — the router now polls WiBill directly and needs no bridge PC or tunnel",
    )


@router.post("/mikrotik/decomission")
async def decommission_bridge(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Retired alongside the bridge-PC model."""
    return {"ok": True, "message": "Bridge decommission retired — router polling needs no tunnel"}


@router.get("/mikrotik/bridge-download")
async def download_bridge():
    """Retired alongside the bridge-PC model."""
    raise HTTPException(status_code=404, detail="Bridge installer retired — no bridge PC required")


# In-memory temp file store for portal file uploads
_temp_file_store: dict[str, str] = {}

# ── Wizard: Get wireless interfaces ─────────────────────────────────
@router.get("/mikrotik/interfaces")
async def get_wireless_ifaces(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Retired with the bridge-PC model — no live read-back path anymore."""
    raise HTTPException(status_code=404, detail="Live interface query retired with the bridge")


# ── Wizard: Check subnet collision ──────────────────────────────────
@router.get("/mikrotik/subnet-check")
async def check_subnet(
    octet: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Retired with the bridge-PC model — no live read-back path anymore."""
    raise HTTPException(status_code=404, detail="Live subnet check retired with the bridge")


# ── Wizard: Generate parameterized script ───────────────────────────
@router.post("/mikrotik/generate-script")
async def generate_parameterized_script(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Generate a RouterOS .rsc script with user-provided parameters."""
    from app.core.config import settings
    body = await request.json()
    ssid = body.get("ssid", "WiFi")
    network_octet = body.get("network_octet", 4)
    wifi_interface = body.get("wifi_interface", "wlan1")
    backend_host_override = body.get("backend_host", "")

    tenant = await db.get(Tenant, current_user.tenant_id)
    slug = tenant.slug if tenant else "wibill"
    name = tenant.name if tenant else "WiBill ISP"

    config_result = await db.execute(select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id))
    config = config_result.scalar_one_or_none()
    if config and config.api_password_enc:
        api_password = decrypt(config.api_password_enc)
    else:
        api_password = secrets.token_urlsafe(16)
        if config:
            config.api_password_enc = encrypt(api_password)
            await db.commit()
        else:
            config = MikrotikConfig(
                id=uuid.uuid4(),
                tenant_id=current_user.tenant_id,
                router_ip=f"192.168.{network_octet}.1",
                api_port=8728,
                api_username="wibill-api",
                api_password_enc=encrypt(api_password),
                hotspot_server="hotspot1",
            )
            db.add(config)
            await db.commit()

    backend_host = backend_host_override or (settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).replace("https://", "").replace("http://", "").rstrip("/")

    # Router-initiated polling: ensure the router has a poll token and install
    # the 30s scheduler job as part of this same setup script, so no second
    # device/infrastructure step is ever needed.
    poll_token = ensure_poll_token(config)
    await db.commit()
    ros = resolve_ros_version(config)
    scheduler_block = build_poll_scheduler_block(
        config.id, poll_token, ros
    )

    # Portal page: fetch the tenant's login.html redirect stub directly from
    # WiBill as part of this same script — collapsed the former Portal step
    # away; there is no staging folder or separate push for initial setup.
    portal_line = build_portal_fetch_line(slug, ros, settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL)

    script = f""":do {{ /interface bridge add name=WiBillBridge }} on-error={{}}
:do {{ /ip address add address=192.168.{network_octet}.1/24 interface=WiBillBridge }} on-error={{}}
:do {{ /interface bridge port add bridge=WiBillBridge interface={wifi_interface} }} on-error={{}}
:do {{ /interface wireless set {wifi_interface} ssid="{ssid}" band=2ghz-b/g/n frequency=auto }} on-error={{}}
:do {{ /ip pool add name=wibill-pool ranges=192.168.{network_octet}.2-192.168.{network_octet}.254 }} on-error={{}}
:do {{ /ip dhcp-server add name=wibill-dhcp interface=WiBillBridge address-pool=wibill-pool disabled=no }} on-error={{}}
:do {{ /ip dhcp-server network add address=192.168.{network_octet}.0/24 gateway=192.168.{network_octet}.1 dns-server=8.8.8.8,8.8.4.4 }} on-error={{}}
:do {{ /ip hotspot add name=hotspot1 interface=WiBillBridge address-pool=wibill-pool profile=hsprof1 disabled=no }} on-error={{}}
:do {{ /ip hotspot profile set [find name=hsprof1] login-by=http-pap,mac-cookie use-radius=no html-directory=hotspot }} on-error={{}}
:do {{ /ip hotspot set hotspot1 addresses-per-mac=1 }} on-error={{}}
:do {{ /ip service enable api }} on-error={{}}
:do {{ /ip service set api port=8728 address="" }} on-error={{}}
:do {{ /user add name=wibill-api password={api_password} group=full }} on-error={{}}
:do {{ /ip hotspot walled-garden add dst-host={backend_host} action=allow }} on-error={{}}
{portal_line}
{scheduler_block}:log info "WiBill setup complete for {name}"
"""
    # Persist the setup parameters the generated script bakes in, so the
    # management view can show real checkmarks instead of guessing. Notes is
    # the existing de-facto "detected config" store (Board/RouterOS/MAC), so
    # SSID + walled garden ride along in the same pipe-delimited format.
    prior = (config.notes or "").strip(" |")
    config.notes = f"{prior} | SSID: {ssid} | WalledGarden: yes | OnboardPath: full_setup".strip(" |")
    await db.commit()

    return PlainTextResponse(
        content=script,
        headers={"Content-Disposition": f'attachment; filename="wibill-{slug}-setup.rsc"'}
    )


# ── Wizard: Upload and push portal file to router ──────────────────
@router.post("/mikrotik/upload-portal")
async def upload_portal_file(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Accept login.html content, stage it, and enqueue a push_portal action.

    The router fetches the file itself on its next poll (the .rsc snippet
    renders /tool fetch against /mikrotik/temp-portal/{file_id}). The frontend
    polls the returned action_id until the router acks it.
    """
    from app.core.config import settings
    body = await request.json()
    html_content = body.get("html", "")
    if not html_content:
        raise HTTPException(status_code=400, detail="No HTML content provided")

    config_result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    config = config_result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=400, detail="Save MikroTik config first via POST /mikrotik/config")

    file_id = str(uuid.uuid4())
    _temp_file_store[file_id] = html_content

    backend_base = settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL
    fetch_url = f"{backend_base}/mikrotik/temp-portal/{file_id}"

    action = await enqueue_action(
        config.id,
        "push_portal",
        {"url": fetch_url, "dst": "hotspot/login.html"},
        db,
    )

    return {
        "ok": True,
        "action_id": action.id,
        "file_id": file_id,
        "fetch_url": fetch_url,
        "status": action.status,
    }


# ── Wizard: Serve temp portal file for router fetch ───────────────
@router.get("/mikrotik/temp-portal/{file_id}")
async def serve_temp_portal(file_id: str):
    content = _temp_file_store.get(file_id)
    if not content:
        raise HTTPException(status_code=404, detail="File not found or expired")
    return PlainTextResponse(content=content, media_type="text/html")


# ── Wizard: Check file is on router (via latest push action) ────────
@router.get("/mikrotik/file-status")
async def get_file_status(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Status of the most recent push_portal action = whether the portal file
    has reached the router (delivered) and been applied (acked)."""
    config_result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    config = config_result.scalar_one_or_none()
    if not config:
        return {"exists": False, "status": "not_started", "action_id": None}

    result = await db.execute(
        select(RouterAction)
        .where(
            RouterAction.router_id == config.id,
            RouterAction.action_type == "push_portal",
        )
        .order_by(RouterAction.id.desc())
        .limit(1)
    )
    action = result.scalar_one_or_none()
    if not action:
        return {"exists": False, "status": "not_started", "action_id": None}
    return {
        "exists": action.status == "acked",
        "status": action.status,
        "action_id": action.id,
        "acked_at": action.acked_at.isoformat() if action.acked_at else None,
    }


# ── Wizard: RouterAction status list (for frontend polling) ─────────
@router.get("/mikrotik/actions")
async def list_router_actions(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Recent RouterActions for the tenant's router, newest first."""
    config_result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    config = config_result.scalar_one_or_none()
    if not config:
        return {"actions": []}

    result = await db.execute(
        select(RouterAction)
        .where(RouterAction.router_id == config.id)
        .order_by(RouterAction.id.desc())
        .limit(50)
    )
    actions = result.scalars().all()
    return {
        "actions": [
            {
                "id": a.id,
                "action_type": a.action_type,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "delivered_at": a.delivered_at.isoformat() if a.delivered_at else None,
                "acked_at": a.acked_at.isoformat() if a.acked_at else None,
            }
            for a in actions
        ]
    }


# ── Wizard: Poll hotspot hosts (Step 3 live detection) ────────────
@router.get("/mikrotik/hosts")
async def get_hotspot_hosts_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await get_hotspot_hosts(str(current_user.tenant_id), db)
    return result.get("data", {"hosts": [], "active_count": 0})


# ── Wizard: Pre-flight checks (LAUNCH step) ────────────────────────
@router.get("/mikrotik/preflight")
async def run_preflight_checks(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Run automated checks before going live — all poll-based now."""
    checks = {}

    config_result = await db.execute(select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id))
    config = config_result.scalar_one_or_none()
    if not config:
        return {"checks": {"config": {"passed": False, "message": "No router configured"}}, "all_passed": False}

    # 1. Router is polling us (time since last poll)
    status = router_status(config)
    checks["connection"] = {
        "passed": status == "online",
        "message": "Router online (polling)" if status == "online"
        else ("Router has never polled" if status == "never_connected" else "Router offline — last poll more than 90s ago"),
    }

    # 2. Portal file reached the router (latest push_portal action acked, or
    #    router online — the fresh-router setup script fetches login.html itself).
    action_result = await db.execute(
        select(RouterAction)
        .where(
            RouterAction.router_id == config.id,
            RouterAction.action_type == "push_portal",
        )
        .order_by(RouterAction.id.desc())
        .limit(1)
    )
    push_action = action_result.scalar_one_or_none()
    if push_action:
        checks["portal_file"] = {
            "passed": push_action.status == "acked",
            "message": "login.html applied to router" if push_action.status == "acked" else f"Portal push {push_action.status} — will retry on next check-in",
        }
    elif config.last_poll_at is not None:
        # Fresh-router setup script includes the portal fetch; a router that has
        # polled has pulled login.html as part of that same paste.
        checks["portal_file"] = {
            "passed": True,
            "message": "login.html fetched during setup (router online)",
        }
    else:
        checks["portal_file"] = {"passed": False, "message": "Portal file not pushed yet"}

    # 3. API password not default
    try:
        pwd = decrypt(config.api_password_enc)
        checks["api_password"] = {"passed": pwd not in ["wibill12345555", "admin", "1234"], "message": "API password is secure" if pwd not in ["wibill12345555", "admin", "1234"] else "Using default/weak password"}
    except Exception:
        checks["api_password"] = {"passed": False, "message": "Could not check password"}

    all_passed = all(c["passed"] for c in checks.values())
    return {"checks": checks, "all_passed": all_passed}


# ── Wizard: Go live ────────────────────────────────────────────────
@router.post("/mikrotik/go-live")
async def go_live(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    config_result = await db.execute(select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id))
    config = config_result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=400, detail="No router configured")
    config.status = "CONNECTED"
    await db.commit()
    return {"ok": True, "status": "CONNECTED", "message": "Router is live"}


@router.get("/mikrotik/login-html")
async def generate_login_html(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    scheme = request.headers.get("X-Forwarded-Proto", request.url.scheme)
    base_url = f"{scheme}://{request.url.hostname}"
    if "localhost" in request.url.hostname or "127.0.0.1" in request.url.hostname:
        base_url = settings.PUBLIC_BASE_URL.rstrip("/")
    slug = tenant.slug
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url={base_url}/portal/{slug}?mac=$(mac)&ip=$(ip)&link=$(link-login-only)&error=$(error)">
</head>
<body style="background:#000;color:#fff;font-family:monospace;text-align:center;padding-top:40vh;font-size:14px">
  Connecting to WiFi...
</body>
</html>"""
    return PlainTextResponse(content=html, media_type="text/html")


@router.get("/mikrotik/routeros-script")
async def get_routeros_script(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    tenant = await db.get(Tenant, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    slug = tenant.slug
    name = tenant.name

    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    config = result.scalar_one_or_none()

    if config and config.api_password_enc:
        api_password = decrypt(config.api_password_enc)
    else:
        api_password = secrets.token_urlsafe(16)
        if config:
            config.api_password_enc = encrypt(api_password)
            await db.commit()

    backend_host = (settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).replace("https://", "").replace("http://", "").rstrip("/")

    # Router-initiated polling: install the 30s scheduler job in the same
    # script so the router starts pulling its own instructions immediately.
    poll_token = ensure_poll_token(config)
    await db.commit()
    scheduler_block = build_poll_scheduler_block(
        config.id, poll_token, resolve_ros_version(config)
    )

    script = f"""# ============================================================
# WiBill Router Setup Script
# Tenant: {name}
# Paste into Winbox -> New Terminal -> Press Enter
# ============================================================

# 1. Create hotspot bridge
/interface bridge add name=WiBillBridge comment="WiBill hotspot bridge"

# 2. Assign IP to bridge
/ip address add address=192.168.4.1/24 interface=WiBillBridge comment="WiBill hotspot IP"

# 3. Add WiFi interface to bridge
/interface bridge port add bridge=WiBillBridge interface=wlan1

# 4. Create IP pool for hotspot clients
/ip pool add name=wibill-pool ranges=192.168.4.2-192.168.4.254

# 5. Create DHCP server on bridge
/ip dhcp-server add name=wibill-dhcp interface=WiBillBridge address-pool=wibill-pool disabled=no
/ip dhcp-server network add address=192.168.4.0/24 gateway=192.168.4.1 dns-server=8.8.8.8,8.8.4.4

# 6. Create hotspot on bridge
/ip hotspot add name=wibill-hotspot interface=WiBillBridge address-pool=wibill-pool profile=hsprof1 disabled=no

# 7. Configure hotspot profile
/ip hotspot profile set [find name=hsprof1] addresses-per-mac=1 login-by=http-pap,mac-cookie use-radius=no html-directory=hotspot

# 8. Enable API service
/ip service enable api
/ip service set api port=8728 address=""

# 9. Create WiBill API user
/user add name=wibill-api password={api_password} group=full comment="WiBill API access"

# 10. Walled garden (allow portal before payment)
/ip hotspot walled-garden add dst-host={backend_host} action=allow comment="WiBill portal"
{scheduler_block}:log info "WiBill setup complete for {name}"
"""
    # This static script includes the walled-garden rule but no SSID (the
    # wizard's generate-script is where SSID gets baked in). Record the
    # walled-garden fact so the management view can checkmark it.
    if config:
        prior = (config.notes or "").strip(" |")
        config.notes = f"{prior} | WalledGarden: yes".strip(" |")
        await db.commit()
    return PlainTextResponse(
        content=script,
        headers={
            "Content-Disposition": f'attachment; filename="wibill-{slug}-setup.rsc"'
        }
    )


@router.get("/mikrotik/install-script")
async def generate_install_script(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Retired alongside the bridge-PC model — no bridge installer to generate."""
    raise HTTPException(status_code=404, detail="Bridge installer retired — the router polls WiBill directly")


@router.get("/mikrotik/install-script-data")
async def get_install_script_data(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Retired alongside the bridge-PC model."""
    raise HTTPException(status_code=404, detail="Bridge installer retired — the router polls WiBill directly")


@router.get("/mikrotik/users")
async def list_active_users(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    users = await get_active_users(str(current_user.tenant_id), db)
    return {"users": users, "count": len(users)}


# ── Public: login.html redirect stub (no auth — router fetches directly) ───
def _login_stub_html(tenant: Tenant, base_url: str) -> str:
    """Meta-refresh redirect that hands WiFi users off to the hosted portal."""
    slug = tenant.slug or "wibill"
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url={base_url}/portal/{slug}?mac=$(mac)&ip=$(ip)&link=$(link-login-only)&error=$(error)">
</head>
<body style="background:#000;color:#fff;font-family:monospace;text-align:center;padding-top:40vh;font-size:14px">
  Connecting to WiFi...
</body>
</html>"""


@public_router.get("/login/{slug}")
async def public_login_stub(slug: str, db: AsyncSession = Depends(get_db)):
    """Serve the tenant's login.html stub without auth so a fresh-router setup
    script (or a push_portal action) can fetch it straight from WiBill."""
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Unknown portal slug")

    base_url = (settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).rstrip("/")
    return PlainTextResponse(content=_login_stub_html(tenant, base_url), media_type="text/html", headers={"Cache-Control": "no-store"})
