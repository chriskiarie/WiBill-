"""
cloudflare_service.py — manage Cloudflare Tunnels for per-ISP bridge access.

Each ISP gets a dedicated tunnel so cloudflared on their on-prem PC connects
to the Cloudflare edge, exposing their local bridge.py at
  https://isp-{slug}.{domain}/ -> 127.0.0.1:8080
without opening any firewall port.
"""
import logging
from httpx import AsyncClient
from app.core.config import settings

logger = logging.getLogger("wibill.cloudflare")

CLOUDFLARE_BASE = "https://api.cloudflare.com/client/v4"

_HEADERS = {
    "Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}",
    "Content-Type": "application/json",
}


async def _cf_post(path: str, json_data: dict) -> dict:
    if not settings.CLOUDFLARE_API_TOKEN:
        raise RuntimeError("CLOUDFLARE_API_TOKEN not configured — tunnel provisioning skipped")
    async with AsyncClient(base_url=CLOUDFLARE_BASE, headers=_HEADERS, timeout=30) as client:
        r = await client.post(path, json=json_data)
        r.raise_for_status()
        body = r.json()
        if not body.get("success"):
            errors = body.get("errors", [])
            raise RuntimeError(f"Cloudflare API error: {errors}")
        return body["result"]


async def _cf_get(path: str) -> dict:
    async with AsyncClient(base_url=CLOUDFLARE_BASE, headers=_HEADERS, timeout=30) as client:
        r = await client.get(path)
        r.raise_for_status()
        body = r.json()
        if not body.get("success"):
            errors = body.get("errors", [])
            raise RuntimeError(f"Cloudflare API error: {errors}")
        return body["result"]


async def _cf_delete(path: str) -> dict:
    async with AsyncClient(base_url=CLOUDFLARE_BASE, headers=_HEADERS, timeout=30) as client:
        r = await client.delete(path)
        r.raise_for_status()
        body = r.json()
        if not body.get("success"):
            errors = body.get("errors", [])
            raise RuntimeError(f"Cloudflare API error: {errors}")
        return body["result"]


async def create_tunnel(name: str) -> dict:
    """Create a Cloudflare Tunnel. Returns {id, token, name}."""
    account_id = settings.CLOUDFLARE_ACCOUNT_ID
    result = await _cf_post(
        f"/accounts/{account_id}/cfd_tunnel",
        {"name": name, "tunnel_secret": None},
    )
    logger.info(f"Tunnel created: {result['id']} ({name})")
    return result


async def get_tunnel_token(tunnel_id: str) -> str:
    """Get the tunnel token for cloudflared to authenticate."""
    account_id = settings.CLOUDFLARE_ACCOUNT_ID
    result = await _cf_get(
        f"/accounts/{account_id}/cfd_tunnel/{tunnel_id}/token"
    )
    return result.get("token", "")


async def delete_tunnel(tunnel_id: str) -> None:
    """Delete a Cloudflare Tunnel and clean up resources."""
    account_id = settings.CLOUDFLARE_ACCOUNT_ID
    await _cf_delete(f"/accounts/{account_id}/cfd_tunnel/{tunnel_id}")
    logger.info(f"Tunnel deleted: {tunnel_id}")


async def create_dns_record(name: str, tunnel_id: str) -> dict:
    """Create a CNAME record pointing the subdomain to the tunnel."""
    zone_id = settings.CLOUDFLARE_ZONE_ID
    result = await _cf_post(
        f"/zones/{zone_id}/dns_records",
        {
            "type": "CNAME",
            "name": name,
            "content": f"{tunnel_id}.cfargotunnel.com",
            "ttl": 120,
            "proxied": True,
        },
    )
    logger.info(f"DNS CNAME created: {name}.{settings.CLOUDFLARE_TUNNEL_DOMAIN}")
    return result
