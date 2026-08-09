import secrets
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, PlainTextResponse
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
from app.services.cloudflare_service import create_tunnel, create_dns_record, delete_tunnel
from app.services.mikrotik_service import check_mikrotik_connection, get_active_users, _bridge_url, _bridge_headers, get_wireless_interfaces, get_hotspot_hosts, stage_portal_file, push_file_to_router, check_file_on_router
from app.models.tenant import Tenant


router = APIRouter()


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


@router.get("/mikrotik/test")
@router.post("/mikrotik/test")
async def test_connection(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    return await check_mikrotik_connection(
        str(current_user.tenant_id), db
    )


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

    bridge_result = await check_mikrotik_connection(str(current_user.tenant_id), db)
    bridge_connected = bool(bridge_result.get("connected"))
    router_reachable = bool(bridge_result.get("router_reachable", bridge_connected))

    if not bridge_connected:
        new_status = "ERROR"
        config.last_error_message = bridge_result.get("error", "Bridge unreachable")
    elif not router_reachable:
        new_status = "ERROR"
        config.last_error_message = bridge_result.get("error", "Router unreachable via bridge")
    else:
        new_status = "CONNECTED"
        config.last_connected_at = datetime.utcnow().replace(tzinfo=tz.utc)
        config.last_error_message = None

    config.status = new_status
    await db.commit()

    return {
        "configured": True,
        "status": new_status,
        "connected": bridge_connected,
        "router_reachable": router_reachable,
        "router_ip": config.router_ip,
        "router_identity": bridge_result.get("router_identity"),
        "router_os_version": bridge_result.get("router_os_version"),
        "board_name": bridge_result.get("board_name"),
        "uptime": bridge_result.get("uptime"),
        "hotspot_found": bridge_result.get("hotspot_found"),
        "last_connected_at": config.last_connected_at.isoformat() if config.last_connected_at else None,
        "last_error": config.last_error_message,
    }


@router.post("/mikrotik/provision")
async def provision_bridge(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=400, detail="Save MikroTik config first via POST /mikrotik/config")

    if config.tunnel_id:
        raise HTTPException(status_code=400, detail="Tunnel already provisioned \u2014 delete and re-create if needed")

    tunnel_name = f"isp-{tenant.slug}"
    bridge_secret = secrets.token_hex(32)

    config.bridge_secret_enc = encrypt(bridge_secret)

    if settings.CLOUDFLARE_API_TOKEN:
        tunnel = await create_tunnel(tunnel_name)
        tunnel_token = tunnel.get("token", "")
        subdomain = f"isp-{tenant.slug}"
        await create_dns_record(subdomain, tunnel["id"])
        config.tunnel_token_enc = encrypt(tunnel_token)
        config.tunnel_id = tunnel["id"]
        config.tunnel_hostname = f"{subdomain}.{settings.CLOUDFLARE_TUNNEL_DOMAIN}"
    else:
        tunnel_token = ""
        config.tunnel_hostname = None

    config.status = "PROVISIONED"
    await db.commit()

    return {
        "ok": True,
        "tunnel_id": config.tunnel_id,
        "tunnel_name": tunnel_name,
        "bridge_url": config.tunnel_hostname or "",
        "bridge_secret": bridge_secret,
        "tunnel_token": tunnel_token,
    }


@router.post("/mikrotik/decomission")
async def decommission_bridge(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    config = result.scalar_one_or_none()
    if not config or not config.tunnel_id:
        raise HTTPException(status_code=400, detail="No tunnel to decommission")

    try:
        await delete_tunnel(config.tunnel_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to delete tunnel: {e}")

    config.bridge_secret_enc = None
    config.tunnel_token_enc = None
    config.tunnel_id = None
    config.status = "DISCONNECTED"
    await db.commit()

    return {"ok": True, "message": "Tunnel deleted and config reset"}


@router.get("/mikrotik/bridge-download")
async def download_bridge():
    bridge_path = os.path.join(os.path.dirname(__file__), "..", "..", "bridge.py")
    if not os.path.exists(bridge_path):
        raise HTTPException(status_code=404, detail="bridge.py not found on server")
    return FileResponse(bridge_path, filename="bridge.py", media_type="text/plain")


# In-memory temp file store for portal file uploads
_temp_file_store: dict[str, str] = {}

# ── Wizard: Get wireless interfaces ─────────────────────────────────
@router.get("/mikrotik/interfaces")
async def get_wireless_ifaces(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await get_wireless_interfaces(str(current_user.tenant_id), db)
    return result.get("data", {"interfaces": []})


# ── Wizard: Check subnet collision ──────────────────────────────────
@router.get("/mikrotik/subnet-check")
async def check_subnet(
    octet: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Check if a subnet octet collides with existing networks on the router."""
    config_result = await db.execute(select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id))
    config = config_result.scalar_one_or_none()
    if not config:
        return {"available": True, "note": "No config — assuming available"}
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{_bridge_url(config)}/addresses", headers=_bridge_headers(config))
            if r.status_code == 200:
                addrs = r.json().get("addresses", [])
                target = f"192.168.{octet}."
                collision = any(target in a.get("address", "") for a in addrs)
                return {"available": not collision, "conflicting": target if collision else None, "addresses": addrs[:10]}
            return {"available": True}
    except Exception:
        return {"available": True}


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
            new_config = MikrotikConfig(
                id=uuid.uuid4(),
                tenant_id=current_user.tenant_id,
                router_ip=f"192.168.{network_octet}.1",
                api_port=8728,
                api_username="wibill-api",
                api_password_enc=encrypt(api_password),
                hotspot_server="hotspot1",
            )
            db.add(new_config)
            await db.commit()

    backend_host = backend_host_override or (settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).replace("https://", "").replace("http://", "").rstrip("/")

    tunnel_host = config.tunnel_hostname if config and config.tunnel_hostname else ""
    bridge_host_lines = ""
    if tunnel_host:
        bridge_host_lines = f":do {{ /ip hotspot walled-garden add dst-host={tunnel_host} action=allow }} on-error={{ }}\n"

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
{bridge_host_lines}:log info "WiBill setup complete for {name}"
"""
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
    """Accept login.html content, stage it, tell router to fetch it."""
    from app.core.config import settings
    body = await request.json()
    html_content = body.get("html", "")
    if not html_content:
        raise HTTPException(status_code=400, detail="No HTML content provided")

    # Stage file on bridge
    stage = await stage_portal_file(str(current_user.tenant_id), html_content, "login.html", db)
    if not stage.get("success"):
        raise HTTPException(status_code=502, detail=stage.get("error", "Failed to stage file"))

    file_id = stage["data"]["file_id"]
    backend_base = settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL
    fetch_url = f"{backend_base}/api/mikrotik/temp-portal/{file_id}"

    # Store for serving
    _temp_file_store[file_id] = html_content

    # Tell router to fetch it
    push = await push_file_to_router(str(current_user.tenant_id), file_id, fetch_url, "hotspot/login.html", db)
    if not push.get("success"):
        raise HTTPException(status_code=502, detail=push.get("error", "Failed to push file to router"))

    return {"ok": True, "file_id": file_id, "fetch_url": fetch_url}


# ── Wizard: Serve temp portal file for router fetch ───────────────
@router.get("/mikrotik/temp-portal/{file_id}")
async def serve_temp_portal(file_id: str):
    content = _temp_file_store.get(file_id)
    if not content:
        raise HTTPException(status_code=404, detail="File not found or expired")
    return PlainTextResponse(content=content, media_type="text/html")


# ── Wizard: Check file is on router ────────────────────────────────
@router.get("/mikrotik/file-status")
async def get_file_status(
    path: str = "hotspot/login.html",
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await check_file_on_router(str(current_user.tenant_id), path, db)
    return result


# ── Wizard: Poll hotspot hosts (Step 3 live detection) ────────────
@router.get("/mikrotik/hosts")
async def get_hotspot_hosts_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await get_hotspot_hosts(str(current_user.tenant_id), db)
    return result.get("data", {"hosts": [], "active_count": 0})


# ── Wizard: Pre-flight checks (Step 4) ────────────────────────────
@router.get("/mikrotik/preflight")
async def run_preflight_checks(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Run automated checks before going live."""
    import httpx
    checks = {}

    config_result = await db.execute(select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id))
    config = config_result.scalar_one_or_none()
    if not config:
        return {"checks": {"config": {"passed": False, "message": "No router configured"}}, "all_passed": False}

    bridge_result = await check_mikrotik_connection(str(current_user.tenant_id), db)
    checks["connection"] = {"passed": bool(bridge_result.get("connected")), "message": bridge_result.get("error", "Connected") if not bridge_result.get("connected") else "Router reachable"}

    # Check walled garden rules
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{_bridge_url(config)}/walled-garden", headers=_bridge_headers(config))
            if r.status_code == 200:
                wg = r.json()
                has_wildcard = any("0.0.0.0" in str(e.get("dst-address", "")) for e in wg.get("ip", []))
                checks["walled_garden"] = {"passed": not has_wildcard, "message": "No blanket 0.0.0.0/0 rules" if not has_wildcard else "Blanket 0.0.0.0/0 rule detected"}
            else:
                checks["walled_garden"] = {"passed": False, "message": "Could not check"}
    except Exception:
        checks["walled_garden"] = {"passed": False, "message": "Could not reach bridge"}

    # Check hotspot interface matches bridge
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{_bridge_url(config)}/hotspot", headers=_bridge_headers(config))
            if r.status_code == 200:
                hs = r.json()
                servers = hs.get("servers", [])
                if servers:
                    s = servers[0]
                    checks["hotspot_binding"] = {"passed": s.get("interface") == "WiBillBridge", "message": f"Hotspot on {s.get('interface')}"}
                else:
                    checks["hotspot_binding"] = {"passed": False, "message": "No hotspot server found"}
            else:
                checks["hotspot_binding"] = {"passed": False, "message": "Could not check"}
    except Exception:
        checks["hotspot_binding"] = {"passed": False, "message": "Could not reach bridge"}

    # Check login.html exists
    file_check = await check_file_on_router(str(current_user.tenant_id), "hotspot/login.html", db)
    checks["portal_file"] = {"passed": file_check.get("exists", False), "message": "login.html found" if file_check.get("exists") else "login.html not found on router"}

    # Check API password not default
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

    tunnel_host = config.tunnel_hostname if config and config.tunnel_hostname else ""
    bridge_host_lines = ""
    if tunnel_host:
        bridge_host_lines = f'/ip hotspot walled-garden add dst-host={tunnel_host} action=allow comment="WiBill bridge"\n'

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

# 10. Walled garden (allow portal and bridge before payment)
/ip hotspot walled-garden add dst-host={backend_host} action=allow comment="WiBill portal"
{bridge_host_lines}:log info "WiBill setup complete for {name}"
"""
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
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=400, detail="Save MikroTik config first via POST /mikrotik/config")

    router_ip = config.router_ip
    if router_ip.startswith("http"):
        router_ip = router_ip.replace("https://", "").replace("http://", "").split("/")[0]

    bridge_secret = decrypt(config.bridge_secret_enc) if config.bridge_secret_enc else secrets.token_hex(32)
    tunnel_token = decrypt(config.tunnel_token_enc) if config.tunnel_token_enc else None
    api_password = decrypt(config.api_password_enc)

    has_tunnel = bool(tunnel_token and config.tunnel_hostname)

    # ── Read bridge.py source from repo and inline it (single source of truth) ──
    bridge_source_path = os.path.join(os.path.dirname(__file__), "..", "..", "bridge.py")
    if not os.path.exists(bridge_source_path):
        raise HTTPException(status_code=500, detail="bridge.py not found in repository")
    bridge_source = open(bridge_source_path, "r", encoding="utf-8").read()
    if "\n'@" in bridge_source or bridge_source.startswith("'@"):
        raise HTTPException(status_code=500, detail="bridge.py contains a line starting with '@ which would break the installer heredoc")

    tunnel_section = ""
    if has_tunnel:
        tunnel_section = f"""
# -- 7. Install cloudflared tunnel service --
$cloudflared = (Get-Command "cloudflared.exe" -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) {{
    Write-Host "Downloading cloudflared..."
    try {{
        $zip = "$env:TEMP\\cloudflared.zip"
        Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.zip" -OutFile "$zip"
        Expand-Archive -LiteralPath "$zip" -DestinationPath "$WIBILL_DIR" -Force
        $cloudflared = "$WIBILL_DIR\\cloudflared.exe"
    }} catch {{
        Write-Error "Could not download cloudflared: $($_.Exception.Message)"
        exit 1
    }}
}}
& $cloudflared service uninstall 2>$null
Start-Sleep -Seconds 2
try {{
    & $cloudflared service install "{tunnel_token}"
    Write-Host "Cloudflare tunnel installed."
}} catch {{
    Write-Error "Could not install cloudflared service: $($_.Exception.Message)"
    exit 1
}}
"""

    script = f"""$ErrorActionPreference = "Stop"
$WIBILL_DIR = "C:\\WiBill"

# -- 1. Create working directory --
try {{
    New-Item -ItemType Directory -Path "$WIBILL_DIR" -Force | Out-Null
    Set-Location -LiteralPath "$WIBILL_DIR"
    Write-Host "Working directory: $WIBILL_DIR"
}} catch {{
    Write-Error "Could not create working directory: $($_.Exception.Message)"
    exit 1
}}

# -- 2. Find Python --
$python = (Get-Command "python" -ErrorAction SilentlyContinue).Source
if (-not $python) {{ $python = (Get-Command "python3" -ErrorAction SilentlyContinue).Source }}
if (-not $python) {{
    Write-Error "Python not found. Install Python 3.10+ from https://www.python.org/downloads/, then run this script again."
    exit 1
}}
Write-Host "Python: $python"

# -- 3. Write bridge.py (embedded, no download) --
try {{
@'
{bridge_source}
'@ | Set-Content -Path "$WIBILL_DIR\\bridge.py" -Encoding UTF8
    Write-Host "bridge.py written."
}} catch {{
    Write-Error "Could not write bridge.py: $($_.Exception.Message)"
    exit 1
}}

# -- 4. Write .env --
try {{
@"
MIKROTIK_HOST={router_ip}
MIKROTIK_PORT={config.api_port}
MIKROTIK_USERNAME={config.api_username}
MIKROTIK_PASSWORD={api_password}
WIBILL_BRIDGE_SECRET={bridge_secret}
HOTSPOT_SERVER={config.hotspot_server}
BRIDGE_VERSION={settings.MIKROTIK_BRIDGE_VERSION}
"@ | Set-Content -Path "$WIBILL_DIR\\.env" -Encoding UTF8
    Write-Host ".env written."
}} catch {{
    Write-Error "Could not write .env: $($_.Exception.Message)"
    exit 1
}}

# -- 5. Install Python dependencies --
Write-Host "Installing Python dependencies..."
try {{
    & $python -m pip install fastapi uvicorn librouteros httpx --quiet 2>&1 | Out-Null
    Write-Host "Dependencies installed."
}} catch {{
    Write-Error "Could not install Python dependencies. Check your internet connection and try again. (pip error: $($_.Exception.Message))"
    exit 1
}}

# -- 6. Install bridge.py as a Windows service (via NSSM) --
$nssm = (Get-Command "nssm.exe" -ErrorAction SilentlyContinue).Source
if (-not $nssm) {{
    Write-Host "Downloading NSSM..."
    try {{
        $zip = "$env:TEMP\\nssm.zip"
        Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "$zip"
        Expand-Archive -LiteralPath "$zip" -DestinationPath "$env:TEMP\\nssm" -Force
        $nssm = "$env:TEMP\\nssm\\nssm-2.24\\win64\\nssm.exe"
    }} catch {{
        Write-Error "Could not download NSSM: $($_.Exception.Message)"
        exit 1
    }}
}}

# -- 7. Remove any existing WiBillBridge service (idempotent re-run safety) --
& $nssm stop WiBillBridge 2>$null
& $nssm remove WiBillBridge confirm 2>$null
Start-Sleep -Seconds 1

try {{
    & $nssm install WiBillBridge $python "`"$WIBILL_DIR\\bridge.py`""
    & $nssm set WiBillBridge AppDirectory "$WIBILL_DIR"
    & $nssm set WiBillBridge Start SERVICE_AUTO_START
    & $nssm set WiBillBridge AppStdout "$WIBILL_DIR\\bridge.log"
    & $nssm set WiBillBridge AppStderr "$WIBILL_DIR\\bridge.log"
    Write-Host "Installing WiBillBridge service..."
    & $nssm start WiBillBridge
}} catch {{
    Write-Error "Could not install WiBillBridge service: $($_.Exception.Message)"
    exit 1
}}
{tunnel_section}
# -- 8. Self-verify: bridge process up + router reachable --
Start-Sleep -Seconds 3
Write-Host ""
Write-Host "Checking bridge health..."
try {{
    $health = Invoke-WebRequest -Uri "http://127.0.0.1:8080/health" -Headers @{{"X-WiBill-Bridge-Secret"="{bridge_secret}"}} -UseBasicParsing
    $result = $health.Content | ConvertFrom-Json
    $bridgeUp = $true
    $routerUp = $result.router_reachable
    Write-Host ("Bridge process: " + $(if ($bridgeUp) {{ "PASSED" }} else {{ "FAILED" }}))
    Write-Host ("Router connection: " + $(if ($routerUp) {{ "PASSED (reached {router_ip})" }} else {{ "FAILED" }}))
    if (-not $routerUp) {{
        Write-Host "Router unreachable. Check that the router is powered on and MIKROTIK_HOST in .env is correct."
    }}
}} catch {{
    Write-Host "Bridge process: FAILED (bridge not responding)"
    Write-Host "Check C:\\WiBill\\bridge.log for details."
    $bridgeUp = $false
    $routerUp = $false
}}
Write-Host ""
Write-Host "=== WiBill Bridge Installed ==="
Write-Host "Bridge service:     WiBillBridge"
$bridgeState = if ($bridgeUp) {{ "running" }} else {{ "not running" }}
Write-Host "Bridge status:      $bridgeState"
$(if ($has_tunnel) {{ Write-Host "Tunnel service:     cloudflared (running)" }} else {{ Write-Host "Tunnel service:     not installed (no tunnel token configured)" }})
Write-Host "Local health check: $(if ($bridgeUp) {{ 'PASSED' }} else {{ 'FAILED' }})"
Write-Host "Router connection:  $(if ($routerUp) {{ 'PASSED (reached {router_ip})' }} else {{ 'FAILED' }})"
Write-Host ""
Write-Host "Logs:    C:\\WiBill\\bridge.log"
Write-Host "Config:  C:\\WiBill\\.env"
Write-Host ""
Write-Host "You can now return to the WiBill dashboard - it should show Bridge Connected within a few seconds."
Write-Host "If anything failed, just run this same script again - everything is safe to re-run."
"""
    return PlainTextResponse(content=script, media_type="text/plain")


@router.get("/mikrotik/install-script-data")
async def get_install_script_data(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Return decrypted config values so the frontend can build the install script."""
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=400, detail="Save MikroTik config first")

    bridge_secret = decrypt(config.bridge_secret_enc) if config.bridge_secret_enc else secrets.token_hex(32)
    tunnel_token = decrypt(config.tunnel_token_enc) if config.tunnel_token_enc else None
    api_password = decrypt(config.api_password_enc)

    return {
        "router_ip": config.router_ip,
        "api_port": config.api_port,
        "api_username": config.api_username,
        "api_password": api_password,
        "bridge_secret": bridge_secret,
        "hotspot_server": config.hotspot_server,
        "has_tunnel": bool(tunnel_token),
        "tunnel_token": tunnel_token,
    }


@router.get("/mikrotik/users")
async def list_active_users(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    users = await get_active_users(str(current_user.tenant_id), db)
    return {"users": users, "count": len(users)}
