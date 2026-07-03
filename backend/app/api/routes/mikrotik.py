import secrets

from fastapi import APIRouter, Depends, HTTPException
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
from app.services.crypto_service import encrypt
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
    nas_ip_address: Optional[str] = None


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
        "nas_ip_address": config.nas_ip_address,
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
        nas_ip_address=payload.nas_ip_address,
    )
    db.add(config)
    await db.commit()
    return {"ok": True, "id": str(config.id)}


@router.patch("/mikrotik/config")
async def update_config(
    payload: MikrotikConfigPayload,
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
    if payload.api_password and payload.api_password != "••••••••":
        config.api_password_enc = encrypt(payload.api_password)
    config.hotspot_server = payload.hotspot_server
    config.nas_ip_address = payload.nas_ip_address
    await db.commit()
    return {"ok": True}


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
    Lightweight health check polled by the dashboard. Returns configured/
    connected status without requiring a POST test call each time.

    Uses check_mikrotik_connection() (the same bridge-based check as
    POST /mikrotik/test) rather than a raw TCP socket check -- router_ip
    may hold a full bridge URL (see _bridge_url in mikrotik_service.py),
    which a raw socket connect can't parse correctly.
    """
    result = await db.execute(
        select(MikrotikConfig).where(
            MikrotikConfig.tenant_id == current_user.tenant_id
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        return {"configured": False, "connected": False}

    status = await check_mikrotik_connection(str(current_user.tenant_id), db)
    return {
        "configured": True,
        "connected": bool(status.get("connected")),
        "router_ip": config.router_ip,
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


@router.get("/mikrotik/users")
async def list_active_users(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    users = await get_active_users(str(current_user.tenant_id), db)
    return {"users": users, "count": len(users)}
