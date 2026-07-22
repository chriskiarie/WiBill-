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
from app.services.mikrotik_service import check_mikrotik_connection, get_active_users
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
        "api_password": "••••••••",
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
            detail="Config already exists — use PATCH to update"
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
            detail="No config found — use POST to create"
        )
    config.router_ip = payload.router_ip
    config.api_port = payload.api_port
    config.api_username = payload.api_username
    if payload.api_password is not None and payload.api_password != "••••••••":
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
    """
    Health check polled by the dashboard. Returns 4-state connection status
    and persists the detected state to the DB for caching.
    """
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
    """Create Cloudflare tunnel + generate bridge secret for this ISP."""
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
        raise HTTPException(status_code=400, detail="Tunnel already provisioned — delete and re-create if needed")

    tunnel_name = f"isp-{tenant.slug}"
    bridge_secret = secrets.token_hex(32)
    tunnel = await create_tunnel(tunnel_name)
    tunnel_token = tunnel.get("token", "")

    subdomain = f"isp-{tenant.slug}"
    await create_dns_record(subdomain, tunnel["id"])

    config.bridge_secret_enc = encrypt(bridge_secret)
    config.tunnel_token_enc = encrypt(tunnel_token)
    config.tunnel_id = tunnel["id"]
    config.router_ip = f"{subdomain}.{settings.CLOUDFLARE_TUNNEL_DOMAIN}"
    config.status = "PROVISIONED"
    await db.commit()

    return {
        "ok": True,
        "tunnel_id": tunnel["id"],
        "tunnel_name": tunnel_name,
        "bridge_url": f"https://{subdomain}.{settings.CLOUDFLARE_TUNNEL_DOMAIN}",
        "bridge_secret": bridge_secret,
        "tunnel_token": tunnel_token,
    }


@router.post("/mikrotik/decomission")
async def decommission_bridge(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Delete Cloudflare tunnel and reset bridge config for this ISP."""
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
    """Serve bridge.py for ISP to install on their on-prem PC."""
    bridge_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "bridge.py")
    if not os.path.exists(bridge_path):
        raise HTTPException(status_code=404, detail="bridge.py not found on server")
    return FileResponse(bridge_path, filename="bridge.py", media_type="text/plain")


@router.get("/mikrotik/login-html")
async def generate_login_html(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Generate login.html with the ISP's slug pre-filled, ready to upload to Winbox."""
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Use forwarded proto/scheme (handles Railway TLS termination)
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
    """Generate a .rsc RouterOS script that configures the MikroTik completely when pasted into Winbox Terminal."""
    from app.core.config import settings

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
/ip hotspot add name=hotspot1 interface=WiBillBridge address-pool=wibill-pool profile=hsprof1 disabled=no

# 7. Configure hotspot profile
/ip hotspot profile set [find name=hsprof1] idle-timeout=30d keepalive-timeout=30d login-timeout=30d addresses-per-mac=1 login-by=http-pap,mac-cookie use-radius=no html-directory=hotspot

# 8. Enable API service
/ip service enable api
/ip service set api port=8728 address=""

# 9. Create WiBill API user
/user add name=wibill-api password={api_password} group=full comment="WiBill API access"

# 10. Walled garden (hostname-based)
/ip hotspot walled-garden add dst-host={backend_host} action=allow comment="WiBill portal"
/ip hotspot walled-garden add dst-host=mikrotik.wi-bill.com action=allow comment="WiBill bridge"
/ip hotspot walled-garden add dst-host=*.googleapis.com action=allow comment="Google fonts"
/ip hotspot walled-garden add dst-host=*.gstatic.com action=allow comment="Google static"

# 11. Walled garden (IP-based - allow HTTPS/HTTP before auth)
/ip hotspot walled-garden ip add dst-address=0.0.0.0/0 dst-port=443 action=accept comment="Allow HTTPS before auth"
/ip hotspot walled-garden ip add dst-address=0.0.0.0/0 dst-port=80 action=accept comment="Allow HTTP before auth"

:log info "WiBill setup complete for {name}"
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
    """Generate a PowerShell install script with this ISP's secrets embedded."""
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
    if not config.tunnel_id or not config.bridge_secret_enc or not config.tunnel_token_enc:
        raise HTTPException(status_code=400, detail="Run POST /mikrotik/provision first to create tunnel")

    bridge_secret = decrypt(config.bridge_secret_enc)
    tunnel_token = decrypt(config.tunnel_token_enc)
    api_password = decrypt(config.api_password_enc)

    script = f"""<#
.WiBill Bridge Installer — generated for {tenant.name}
.Download bridge.py and cloudflared, set up services on this PC.
.Run this script as Administrator on the always-on PC at the ISP site.
#>

$ErrorActionPreference = "Stop"
$WIBILL_DIR = "C:\\WiBill"

# ── 1. Create working directory ──────────────────────────────────────
New-Item -ItemType Directory -Path "$WIBILL_DIR" -Force | Out-Null
Set-Location -LiteralPath "$WIBILL_DIR"

    # ── 2. Download bridge.py ───────────────────────────────────────────
Write-Host "Downloading bridge.py..."
$BRIDGE_URL = "{settings.PUBLIC_BASE_URL}/api/mikrotik/bridge-download"
Invoke-WebRequest -Uri "$BRIDGE_URL" -OutFile "bridge.py"

# ── 3. Write .env ───────────────────────────────────────────────────
$envContent = @'
MIKROTIK_HOST={config.router_ip}
MIKROTIK_PORT={config.api_port}
MIKROTIK_USERNAME={config.api_username}
MIKROTIK_PASSWORD={api_password}
WIBILL_BRIDGE_SECRET={bridge_secret}
HOTSPOT_SERVER={config.hotspot_server}
BRIDGE_VERSION={settings.MIKROTIK_BRIDGE_VERSION}
'@
Set-Content -Path ".env" -Value $envContent
Write-Host ".env written to $WIBILL_DIR\\.env"

# ── 4. Install cloudflared ──────────────────────────────────────────
$cloudflared = Get-Command "cloudflared.exe" -ErrorAction SilentlyContinue
if (-not $cloudflared) {{
    Write-Host "Downloading cloudflared..."
    $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    Invoke-WebRequest -Uri "$url" -OutFile "cloudflared.exe"
    Move-Item -LiteralPath ".\\cloudflared.exe" -Destination "$env:SYSTEMROOT\\system32\\cloudflared.exe" -Force
    $cloudflaredPath = "$env:SYSTEMROOT\\system32\\cloudflared.exe"
}} else {{
    $cloudflaredPath = $cloudflared.Source
}}
Write-Host "cloudflared ready at $cloudflaredPath"

# ── 5. Install Python packages needed by bridge.py ─────────────────
Write-Host "Installing Python dependencies..."
pip install fastapi uvicorn librouteros httpx > "$WIBILL_DIR\\install.log" 2>&1

# ── 6. Install bridge.py as a service (via NSSM) ────────────────────
$nssm = Get-Command "nssm.exe" -ErrorAction SilentlyContinue
if (-not $nssm) {{
    Write-Host "Downloading NSSM..."
    $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $zip = "$env:TEMP\\nssm.zip"
    Invoke-WebRequest -Uri "$nssmUrl" -OutFile "$zip"
    Expand-Archive -LiteralPath "$zip" -DestinationPath "$env:TEMP\\nssm" -Force
    Copy-Item -LiteralPath "$env:TEMP\\nssm\\nssm-2.24\\win64\\nssm.exe" -Destination "$env:SYSTEMROOT\\system32\\nssm.exe" -Force
    $nssmPath = "$env:SYSTEMROOT\\system32\\nssm.exe"
}} else {{
    $nssmPath = $nssm.Source
}}

& $nssmPath stop WiBillBridge 2>$null
& $nssmPath remove WiBillBridge confirm 2>$null
& $nssmPath install WiBillBridge "C:\\Python313\\python.exe" "`"$WIBILL_DIR\\bridge.py`""
& $nssmPath set WiBillBridge AppDirectory "$WIBILL_DIR"
& $nssmPath set WiBillBridge Start SERVICE_AUTO_START
& $nssmPath set WiBillBridge AppStdout "$WIBILL_DIR\\bridge.log"
& $nssmPath set WiBillBridge AppStderr "$WIBILL_DIR\\bridge.log"
& $nssmPath start WiBillBridge
Write-Host "WiBillBridge service installed and started."

# ── 7. Install cloudflared as a tunnel service ──────────────────────
$tunnelToken = "{tunnel_token}"
& cloudflared.exe service uninstall 2>$null
Start-Sleep -Seconds 2
& cloudflared.exe service install "$tunnelToken"
Write-Host "cloudflared tunnel service installed."

Write-Host ""
Write-Host "=== WiBill Bridge Installation Complete ==="
Write-Host "bridge.py running at http://127.0.0.1:8080"
Write-Host "Cloudflare tunnel established."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Verify tunnel: cloudflared tunnel list"
Write-Host "  2. Check bridge: Invoke-WebRequest http://127.0.0.1:8080/health"
Write-Host "  3. Configure MikroTik hotspot to use the WiBill portal (see docs)"
"""
    return PlainTextResponse(content=script, media_type="text/plain")


@router.get("/mikrotik/users")
async def list_active_users(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    users = await get_active_users(str(current_user.tenant_id), db)
    return {"users": users, "count": len(users)}
