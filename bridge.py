from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import librouteros
from librouteros import connect
from librouteros.exceptions import TrapError, FatalError

app = FastAPI()

ROUTER_IP = "192.168.88.1"
ROUTER_USER = "wibill-api"
ROUTER_PASS = "wibill12345555"
ROUTER_PORT = 8728
HOTSPOT = "hotspot1"


def get_api():
    return connect(host=ROUTER_IP, username=ROUTER_USER, password=ROUTER_PASS, port=ROUTER_PORT, timeout=10)


@app.get("/test")
def test():
    try:
        api = get_api()
        res = list(api("/system/resource/print"))
        identity = list(api("/system/identity/print"))
        hotspots = list(api("/ip/hotspot/print"))
        api.close()
        r = res[0] if res else {}
        return {
            "connected": True,
            "router_identity": identity[0].get("name") if identity else "Unknown",
            "router_os_version": r.get("version"),
            "board_name": r.get("board-name"),
            "uptime": r.get("uptime"),
            "hotspot_found": HOTSPOT in [h.get("name") for h in hotspots],
        }
    except FatalError as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {e}")
    except OSError as e:
        raise HTTPException(status_code=503, detail=f"Cannot reach router: {e}")


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
        result = list(api("/ip/hotspot/user/add", **{"=server": HOTSPOT, "=name": p.username, "=password": p.password, "=mac-address": p.mac_address.upper(), "=limit-uptime": p.limit_uptime, "=comment": f"wibill-{p.session_id[:8]}"}))
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
            try: list(api("/ip/hotspot/active/remove", **{"=.id": a[".id"]}))
            except: pass
        api.close()
        return {"success": True, "removed": bool(users)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/users/remove-by-tag")
def remove_user_by_tag(data: dict):
    tag = data.get("tag")
    if not tag:
        raise HTTPException(status_code=400, detail="'tag' field required")
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
    except: return {"users": [], "count": 0}
