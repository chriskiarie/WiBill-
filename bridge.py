"""
WiBill MikroTik Bridge — HTTP→librouteros proxy.

Runs on an always-on PC at each ISP site alongside cloudflared.
Receives requests from the Railway backend via Cloudflare Tunnel,
proxies them to the local MikroTik router via librouteros.

Security:
  - Binds 127.0.0.1:8080 ONLY (inaccessible from LAN).
  - Requires X-WiBill-Bridge-Secret header on every request.
  - MikroTik API user should be least-privilege (hotspot mgmt only).

Environment variables (all required):
  MIKROTIK_HOST       — Router IP/hostname (e.g. 192.168.88.1)
  MIKROTIK_PORT       — RouterOS API port (default 8728)
  MIKROTIK_USERNAME   — API username (create via Winbox)
  MIKROTIK_PASSWORD   — API password
  WIBILL_BRIDGE_SECRET— Shared secret verified on every request
"""
import os
import logging
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import librouteros
from librouteros import connect
from librouteros.exceptions import TrapError, FatalError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("wibill.bridge")

# ── Config from environment ──────────────────────────────────────────────
MIKROTIK_HOST = os.environ["MIKROTIK_HOST"]
MIKROTIK_PORT = int(os.environ.get("MIKROTIK_PORT", "8728"))
MIKROTIK_USERNAME = os.environ["MIKROTIK_USERNAME"]
MIKROTIK_PASSWORD = os.environ["MIKROTIK_PASSWORD"]
BRIDGE_SECRET = os.environ["WIBILL_BRIDGE_SECRET"]

# Version pinned at build time; bumped via backend installer endpoint
BRIDGE_VERSION = os.environ.get("BRIDGE_VERSION", "1.0.0")

app = FastAPI(title="WiBill MikroTik Bridge", version=BRIDGE_VERSION)


# ── Auth middleware — every request must carry the secret ────────────────
@app.middleware("http")
async def require_bridge_secret(request: Request, call_next):
    if request.url.path == "/favicon.ico":
        import starlette.responses
        return starlette.responses.Response(status_code=404)
    secret = request.headers.get("X-WiBill-Bridge-Secret", "")
    if secret != BRIDGE_SECRET:
        logger.warning(f"Rejected request from {request.client.host}: bad secret")
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await call_next(request)


# ── Router connection helper ─────────────────────────────────────────────
def get_api():
    return connect(
        host=MIKROTIK_HOST,
        username=MIKROTIK_USERNAME,
        password=MIKROTIK_PASSWORD,
        port=MIKROTIK_PORT,
        timeout=10,
    )


# ── Endpoints ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Full router health — not just 'process is up'."""
    try:
        api = get_api()
        res = list(api("/system/resource/print"))
        identity = list(api("/system/identity/print"))
        uptime_data = list(api("/system/uptime/print")) if hasattr(api, "cmd") else []
        api.close()
        r = res[0] if res else {}
        return {
            "connected": True,
            "router_reachable": True,
            "version": BRIDGE_VERSION,
            "stats": {
                "identity": identity[0].get("name") if identity else None,
                "version": r.get("version"),
                "board_name": r.get("board-name"),
                "uptime": r.get("uptime"),
            },
        }
    except (OSError, FatalError) as e:
        return {
            "connected": True,
            "router_reachable": False,
            "version": BRIDGE_VERSION,
            "error": str(e),
        }


@app.get("/test")
def test():
    try:
        api = get_api()
        res = list(api("/system/resource/print"))
        identity = list(api("/system/identity/print"))
        hotspots = list(api("/ip/hotspot/print"))
        api.close()
        r = res[0] if res else {}
        hotspot_name = os.environ.get("HOTSPOT_SERVER", "hotspot1")
        return {
            "connected": True,
            "router_identity": identity[0].get("name") if identity else "Unknown",
            "router_os_version": r.get("version"),
            "board_name": r.get("board-name"),
            "uptime": r.get("uptime"),
            "hotspot_found": hotspot_name in [h.get("name") for h in hotspots],
        }
    except FatalError as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {e}")
    except OSError as e:
        raise HTTPException(status_code=503, detail=f"Cannot reach router: {e}")


@app.get("/hotspot")
def hotspot_config():
    try:
        api = get_api()
        hotspots = list(api("/ip/hotspot/print"))
        active = list(api("/ip/hotspot/active/print"))
        files_raw = list(api("/file/print"))
        api.close()
        hotspot_files = [f for f in files_raw if "hotspot" in f.get("name","").lower() or f.get("name","").startswith("login")]
        return {
            "servers": hotspots,
            "active_sessions": len(active),
            "hotspot_files": hotspot_files[:20],
        }
    except FatalError as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {e}")
    except OSError as e:
        raise HTTPException(status_code=503, detail=f"Cannot reach router: {e}")
    except Exception as e:
        return {"error": str(e)}


class UserPayload(BaseModel):
    username: str
    password: str
    mac_address: str
    limit_uptime: str
    session_id: str


@app.post("/users/create")
def create_user(p: UserPayload):
    try:
        api = get_api()
        hotspot = os.environ.get("HOTSPOT_SERVER", "hotspot1")
        result = list(api(
            "/ip/hotspot/user/add",
            **{"=server": hotspot,
               "=name": p.username,
               "=password": p.password,
               "=mac-address": p.mac_address.upper(),
               "=limit-uptime": p.limit_uptime,
               "=comment": f"wibill-{p.session_id[:8]}"}
        ))
        api.close()
        return {"success": True, "router_id": result[0] if result else None}
    except TrapError as e:
        if "already have such entry" in str(e).lower():
            return {"success": True, "note": "already existed"}
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/users/remove")
def remove_user(data: dict):
    username = data.get("username")
    try:
        api = get_api()
        users = list(api("/ip/hotspot/user/print", **{"?name": username}))
        if users:
            list(api("/ip/hotspot/user/remove", **{"=.id": users[0][".id"]}))
        active = list(api("/ip/hotspot/active/print", **{"?user": username}))
        for a in active:
            try:
                list(api("/ip/hotspot/active/remove", **{"=.id": a[".id"]}))
            except Exception:
                pass
        api.close()
        return {"success": True, "removed": bool(users)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RemoveByTagPayload(BaseModel):
    session_id: str
    tag: str | None = None


@app.post("/users/remove-by-tag")
def remove_user_by_tag(p: RemoveByTagPayload):
    tag = p.tag or f"wibill-{p.session_id[:8]}"
    try:
        api = get_api()
        users = list(api("/ip/hotspot/user/print"))
        removed = []
        for u in users:
            if u.get("comment", "") == tag:
                rid = u[".id"]
                try:
                    list(api("/ip/hotspot/user/remove", **{"=.id": rid}))
                    removed.append(u.get("name"))
                except Exception:
                    pass
        api.close()
        return {"success": True, "removed_count": len(removed), "removed_users": removed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/users/active")
def active_users():
    try:
        api = get_api()
        users = list(api("/ip/hotspot/active/print"))
        api.close()
        return {"users": users, "count": len(users)}
    except Exception:
        return {"users": [], "count": 0}


# ── Entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    logger.info(f"Binding 127.0.0.1:8080 — bridge v{BRIDGE_VERSION}")
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="info")
