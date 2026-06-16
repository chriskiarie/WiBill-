"""
backend/app/api/routes/mikrotik.py
MikroTik RouterOS configuration and management endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import logging

from app.core.database import get_db
from app.models.mikrotik_config import MikrotikConfig
from app.models.mikrotik_active_user import MikrotikActiveUser
from app.models.admin_user import AdminUser
from app.api.routes.auth import get_current_user, require_isp_admin
from app.services.crypto_service import encrypt, decrypt
from app.services.mikrotik_service import (
    test_connection,
    get_router_info,
    list_interfaces,
    list_hotspot_profiles,
    list_hotspot_servers,
    get_active_users as get_router_active_users,
    get_router_stats,
    remove_hotspot_user_by_mac,
)

router = APIRouter(prefix="/mikrotik", tags=["mikrotik"])
logger = logging.getLogger("honestbill.mikrotik")


# ============================================================================
# SCHEMAS
# ============================================================================

class MikrotikCreate(BaseModel):
    router_ip: str
    api_port: int = 8728
    api_username: str
    api_password: str | None = None
    hotspot_server: str = "hotspot1"
    hotspot_profile_name: str = "WiBill_Profile"
    nas_ip_address: str | None = None
    notes: str | None = None


class MikrotikUpdate(BaseModel):
    router_ip: str | None = None
    api_port: int | None = None
    api_username: str | None = None
    api_password: str | None = None
    hotspot_server: str | None = None
    hotspot_profile_name: str | None = None
    nas_ip_address: str | None = None
    notes: str | None = None


# ============================================================================
# CONFIG ENDPOINTS
# ============================================================================

@router.get("/config")
async def get_mikrotik_config(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get MikroTik config for current ISP."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")

    return {
        "id": str(cfg.id),
        "router_ip": cfg.router_ip,
        "api_port": cfg.api_port,
        "api_username": cfg.api_username,
        "hotspot_server": cfg.hotspot_server,
        "hotspot_profile_name": cfg.hotspot_profile_name,
        "nas_ip_address": cfg.nas_ip_address,
        "status": cfg.status,
        "last_connected_at": cfg.last_connected_at.isoformat() if cfg.last_connected_at else None,
        "last_error_message": cfg.last_error_message,
        "notes": cfg.notes,
        "created_at": cfg.created_at.isoformat(),
        "updated_at": cfg.updated_at.isoformat(),
    }


@router.post("/config")
async def create_mikrotik_config(
    data: MikrotikCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Create MikroTik config for current ISP."""
    existing = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Config already exists -- use PATCH to update")
    if not data.api_password:
        raise HTTPException(status_code=400, detail="api_password required for initial setup")

    cfg = MikrotikConfig(
        tenant_id=current_user.tenant_id,
        router_ip=data.router_ip,
        api_port=data.api_port,
        api_username=data.api_username,
        api_password_enc=encrypt(data.api_password),
        hotspot_server=data.hotspot_server,
        hotspot_profile_name=data.hotspot_profile_name or "WiBill_Profile",
        nas_ip_address=data.nas_ip_address,
        notes=data.notes,
    )
    db.add(cfg)
    await db.commit()
    await db.refresh(cfg)
    return {"ok": True, "id": str(cfg.id)}


@router.patch("/config")
async def update_mikrotik_config(
    data: MikrotikUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Update MikroTik config for current ISP."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="Not configured -- use POST first")

    if data.router_ip is not None:          cfg.router_ip = data.router_ip
    if data.api_port is not None:           cfg.api_port = data.api_port
    if data.api_username is not None:       cfg.api_username = data.api_username
    if data.hotspot_server is not None:     cfg.hotspot_server = data.hotspot_server
    if data.hotspot_profile_name is not None: cfg.hotspot_profile_name = data.hotspot_profile_name
    if data.nas_ip_address is not None:     cfg.nas_ip_address = data.nas_ip_address
    if data.notes is not None:              cfg.notes = data.notes
    if data.api_password:                   cfg.api_password_enc = encrypt(data.api_password)

    await db.commit()
    return {"ok": True}


# ============================================================================
# TEST & HEALTH ENDPOINTS
# ============================================================================

@router.post("/test")
async def test_mikrotik_connection(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Test MikroTik RouterOS API connectivity with detailed diagnostics."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")

    api_password = decrypt(cfg.api_password_enc)
    ok, message, info = await test_connection(
        host=cfg.router_ip,
        port=cfg.api_port,
        username=cfg.api_username,
        password=api_password,
    )

    if ok:
        cfg.status = "CONNECTED"
        cfg.last_connected_at = __import__("datetime").datetime.utcnow()
        cfg.last_error_message = None
        await db.commit()
        return {"ok": True, "message": message, "info": info}

    cfg.status = "ERROR"
    cfg.last_error_message = message
    await db.commit()
    raise HTTPException(status_code=502, detail=message)


@router.post("/test-raw")
async def test_raw_connection(
    data: MikrotikCreate,
    current_user: AdminUser = Depends(get_current_user),
):
    """Test connection using provided credentials (without saving)."""
    ok, message, info = await test_connection(
        host=data.router_ip,
        port=data.api_port,
        username=data.api_username,
        password=data.api_password or "",
    )
    if ok:
        return {"ok": True, "message": message, "info": info}
    raise HTTPException(status_code=502, detail=message)


@router.get("/health")
async def mikrotik_health(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get detailed health info from the MikroTik router."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")

    api_password = decrypt(cfg.api_password_enc)
    stats = await get_router_stats(
        host=cfg.router_ip,
        port=cfg.api_port,
        username=cfg.api_username,
        password=api_password,
    )

    return {
        "connected": bool(stats),
        "status": cfg.status,
        "stats": stats,
        "last_connected_at": cfg.last_connected_at.isoformat() if cfg.last_connected_at else None,
        "last_error": cfg.last_error_message,
    }


@router.get("/explore")
async def explore_router(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Explore router configuration: interfaces, hotspot profiles, servers."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")

    api_password = decrypt(cfg.api_password_enc)
    interfaces, profiles, servers = await __import__("asyncio").gather(
        list_interfaces(cfg.router_ip, cfg.api_port, cfg.api_username, api_password),
        list_hotspot_profiles(cfg.router_ip, cfg.api_port, cfg.api_username, api_password),
        list_hotspot_servers(cfg.router_ip, cfg.api_port, cfg.api_username, api_password),
    )
    return {
        "interfaces": interfaces,
        "hotspot_profiles": profiles,
        "hotspot_servers": servers,
    }


# ============================================================================
# USER MANAGEMENT
# ============================================================================

@router.get("/users")
async def list_mikrotik_users(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get list of currently active users on the MikroTik router."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")

    api_password = decrypt(cfg.api_password_enc)
    users = await get_router_active_users(
        host=cfg.router_ip,
        port=cfg.api_port,
        username=cfg.api_username,
        password=api_password,
    )
    return users


@router.get("/users/{mac_address}")
async def get_mikrotik_user(
    mac_address: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get specific active user by MAC address from MikroTik."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")

    api_password = decrypt(cfg.api_password_enc)
    users = await get_router_active_users(
        host=cfg.router_ip,
        port=cfg.api_port,
        username=cfg.api_username,
        password=api_password,
    )
    for u in users:
        if u.get("mac_address", "").upper() == mac_address.upper() or u.get("user", "").upper() == mac_address.upper():
            return u
    raise HTTPException(status_code=404, detail=f"User {mac_address} not found on router")


@router.post("/users/{mac_address}/disconnect")
async def disconnect_mikrotik_user(
    mac_address: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Disconnect a hotspot user by MAC address."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")

    api_password = decrypt(cfg.api_password_enc)
    res = await remove_hotspot_user_by_mac(
        host=cfg.router_ip,
        port=cfg.api_port,
        username=cfg.api_username,
        password=api_password,
        mac_address=mac_address,
    )
    if res.get("success"):
        return {"ok": True, "message": res["message"]}
    raise HTTPException(status_code=500, detail=res.get("message", "Failed to disconnect"))


# ============================================================================
# INITIALIZATION SCRIPT GENERATOR
# ============================================================================

@router.get("/init-script")
async def generate_init_script(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Generate an .rsc initialization script for the ISP's MikroTik."""
    result = await db.execute(
        select(MikrotikConfig).where(MikrotikConfig.tenant_id == current_user.tenant_id)
    )
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="MikroTik not configured")

    from app.models.tenant import Tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    slug = tenant.slug if tenant else "your-isp"

    from datetime import date
    today = date.today().isoformat()

    script = f"""# ════════════════════════════════════════════════════════════════════════════
# WIBILL AUTOMATED MIKROTIK CONFIGURATION SCRIPT
# Generated for: {tenant.name if tenant else 'Your ISP'}
# Date: {today}
# RouterOS Version: 7.0+
# ════════════════════════════════════════════════════════════════════════════

# ── Step 1: Enable API access (required for WiBill to control the router) ──
/ip service enable api
/ip service set api address=0.0.0.0/0

# ── Step 2: Create API user for WiBill ──
/user add name=wibill_api password=CHANGE_THIS_PASSWORD group=full disabled=no

# ── Step 3: Create hotspot profile (if it doesn't exist) ──
/ip hotspot profile add name="{cfg.hotspot_profile_name or "WiBill_Profile"}" \\
  hotspot-address={cfg.router_ip} login-by=http-pap use-radius=no

# ── Step 4: Create hotspot server on the LAN interface ──
# Replace "ether5" with your LAN interface name
/ip hotspot add name="WiBill_Hotspot" interface=ether5 \\
  profile="{cfg.hotspot_profile_name or "WiBill_Profile"}" disabled=no

# ── Step 5: Optional - Disable unused services ──
/ip service set telnet disabled=yes
/ip service set ftp disabled=yes

# ── Verification ──
:log info "WiBill Hotspot Initialized"
:put "WiBill configuration complete"
"""

    return {
        "script": script,
        "filename": f"wibill_init_{slug}_{today}.rsc",
        "instructions": [
            "1. Open WinBox and connect to your MikroTik",
            "2. Open Terminal (menu: New Terminal)",
            "3. Copy the script below and paste into Terminal",
            "4. Press Enter to execute",
            "5. You can also download this as a .rsc file and drag into WinBox",
        ],
    }
