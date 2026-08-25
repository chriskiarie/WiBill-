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
import ipaddress
import logging
from pathlib import Path

# Load .env file from same directory as this script
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import PlainTextResponse
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


# ── In-memory file store for staged portal files ─────────────────────────
_temp_files: dict[str, dict] = {}
import secrets as _secrets
import time as _time


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


# ── Wireless interfaces ───────────────────────────────────────────
@app.get("/interfaces/wireless")
def wireless_interfaces():
    try:
        api = get_api()
        ifaces = list(api("/interface/wireless/print"))
        api.close()
        return {"interfaces": [{"name": i.get("name"), "ssid": i.get("ssid", ""), "band": i.get("band", ""), "enabled": i.get("disabled", "false") != "true"} for i in ifaces]}
    except FatalError as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Stage a file for the router to fetch ─────────────────────────
@app.post("/file/stage")
def stage_file(data: dict):
    file_id = _secrets.token_hex(8)
    _temp_files[file_id] = {"content": data.get("content", ""), "path": data.get("path", "login.html"), "created": _time.time()}
    return {"file_id": file_id, "ttl_seconds": 300}

@app.get("/file/serve/{file_id}")
def serve_file(file_id: str):
    meta = _temp_files.get(file_id)
    if not meta:
        raise HTTPException(status_code=404, detail="File not found or expired")
    return PlainTextResponse(meta["content"], media_type="text/html")

@app.post("/file/push-to-router")
def push_file_to_router(data: dict):
    file_id = data.get("file_id")
    fetch_url = data.get("fetch_url", "")
    dst_path = data.get("dst_path", "hotspot/login.html")
    try:
        api = get_api()
        list(api("/tool/fetch", **{"=url": fetch_url, "=dst-path": dst_path}))
        api.close()
        return {"success": True, "message": f"Fetching {fetch_url} to {dst_path}"}
    except TrapError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/file/status/{path:path}")
def file_status(path: str):
    try:
        api = get_api()
        files = list(api("/file/print", **{"?name": path}))
        api.close()
        if files:
            f = files[0]
            return {"exists": True, "name": f.get("name"), "size": f.get("size", "0"), "type": f.get("type", "")}
        return {"exists": False}
    except Exception as e:
        return {"exists": False, "error": str(e)}


# ── Hotspot hosts (for device detection in Step 3) ──────────────
@app.get("/hosts")
def hotspot_hosts():
    try:
        api = get_api()
        hosts = list(api("/ip/hotspot/host/print"))
        active = list(api("/ip/hotspot/active/print"))
        api.close()
        return {"hosts": [{"mac": h.get("mac-address"), "address": h.get("address"), "authorized": h.get("authorized")} for h in hosts], "active_count": len(active)}
    except Exception:
        return {"hosts": [], "active_count": 0}


# ── Router addresses (for subnet collision check) ─────────────────
@app.get("/addresses")
def router_addresses():
    try:
        api = get_api()
        addrs = list(api("/ip/address/print"))
        api.close()
        return {"addresses": [{"address": a.get("address"), "interface": a.get("interface"), "network": a.get("network")} for a in addrs]}
    except Exception as e:
        return {"addresses": [], "error": str(e)}


# ── Walled garden rules (for preflight checks) ────────────────────
@app.get("/walled-garden")
def walled_garden_rules():
    try:
        api = get_api()
        host_rules = list(api("/ip/hotspot/walled-garden/print"))
        ip_rules = list(api("/ip/hotspot/walled-garden/ip/print"))
        api.close()
        return {"host": host_rules, "ip": ip_rules}
    except Exception as e:
        return {"host": [], "ip": [], "error": str(e)}


class WalledGardenAddPayload(BaseModel):
    hosts: list[str]

@app.post("/walled-garden/add")
def add_walled_garden_entries(p: WalledGardenAddPayload):
    """Add walled-garden entries directly via RouterOS API (bypasses poll)."""
    results = []
    try:
        api = get_api()
        for host in p.hosts:
            host = host.strip()
            if not host:
                continue
            try:
                api("/ip/hotspot/walled-garden/add",
                    **{"dst-host": host, "action": "allow"})
                results.append({"host": host, "ok": True})
            except Exception as e:
                results.append({"host": host, "ok": False, "error": str(e)})
        api.close()
        return {"ok": True, "results": results}
    except FatalError as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {e}")
    except OSError as e:
        raise HTTPException(status_code=503, detail=f"Cannot reach router: {e}")
    except Exception as e:
        return {"ok": False, "error": str(e), "results": results}


@app.post("/walled-garden/reset")
def reset_walled_garden(p: WalledGardenAddPayload):
    """Remove ALL walled-garden entries, then re-add the correct ones."""
    try:
        api = get_api()
        # Remove all existing entries
        api("/ip/hotspot/walled-garden/remove", **{"numbers": "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50"})
        # Remove any remaining entries
        remaining = list(api("/ip/hotspot/walled-garden/print"))
        if remaining:
            nums = ",".join(str(i) for i in range(len(remaining)))
            api("/ip/hotspot/walled-garden/remove", **{"numbers": nums})
        # Re-add correct entries
        results = []
        for host in p.hosts:
            host = host.strip()
            if not host:
                continue
            try:
                api("/ip/hotspot/walled-garden/add",
                    **{"dst-host": host, "action": "allow"})
                results.append({"host": host, "ok": True})
            except Exception as e:
                results.append({"host": host, "ok": False, "error": str(e)})
        api.close()
        return {"ok": True, "results": results}
    except FatalError as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {e}")
    except OSError as e:
        raise HTTPException(status_code=503, detail=f"Cannot reach router: {e}")
    except Exception as e:
        return {"ok": False, "error": str(e), "results": []}


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


# ── Monthly Subscriber (Static IP) Endpoints ─────────────────────────────

class SubscriberPayload(BaseModel):
    subscriber_id: str
    ip_address: str
    mac_address: str = ""
    plan_id: str | None = None


class SubscriberIpPayload(BaseModel):
    subscriber_id: str
    ip_address: str


@app.post("/subscriber/activate")
def subscriber_activate(p: SubscriberPayload):
    """
    Provision a static IP subscriber on the router.
    Creates: ARP entry, firewall address list, queue, and NAT.
    """
    try:
        api = get_api()
        ip = p.ip_address
        mac = p.mac_address.upper() if p.mac_address else ""
        comment = f"wibill-sub-{p.subscriber_id[:8]}"

        # 1. Add ARP entry (if MAC provided)
        if mac and mac != "00:00:00:00:00:00":
            existing_arp = list(api("/ip/arp/print", **{"?address": ip}))
            if not existing_arp:
                try:
                    api("/ip/arp/add", **{
                        "=address": ip,
                        "=mac-address": mac,
                        "=interface": os.environ.get("SUBNET_INTERFACE", "bridge"),
                        "=comment": comment,
                    })
                except TrapError as e:
                    if "already" not in str(e).lower():
                        raise

        # 2. Add firewall address list
        existing_fw = list(api("/ip/firewall/address-list/print", **{"?address": ip}))
        if not existing_fw:
            api("/ip/firewall/address-list/add", **{
                "=address": ip,
                "=list": "wibill-subscribers",
                "=comment": comment,
            })

        # 3. Create queue with bandwidth limits
        existing_q = list(api("/queue/simple/print", **{"?target": ip}))
        if not existing_q:
            plan_id = p.plan_id or ""
            bw_down = f"{os.environ.get('DEFAULT_BW_DOWN', '10M')}"
            bw_up = f"{os.environ.get('DEFAULT_BW_UP', '5M')}"
            api("/queue/simple/add", **{
                "=name": f"sub-{p.subscriber_id[:8]}",
                "=target": ip,
                "=max-limit": f"{bw_down}/{bw_up}",
                "=comment": comment,
                "=parent": "none",
                "=queue": "default",
            })

        # 4. Add NAT rule for internet access (masquerade)
        existing_nat = list(api("/ip/firewall/nat/print", **{"?to-addresses": ip}))
        if not existing_nat and os.environ.get("SUBNET_INTERFACE"):
            pass  # NAT is typically handled at the WAN level, not per-IP

        api.close()
        return {"success": True, "message": f"Subscriber {ip} activated on router"}
    except TrapError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/subscriber/deactivate")
def subscriber_deactivate(p: SubscriberIpPayload):
    """Remove a static IP subscriber from the router."""
    try:
        api = get_api()
        ip = p.ip_address
        comment_prefix = f"wibill-sub-{p.subscriber_id[:8]}"

        # Remove queue
        queues = list(api("/queue/simple/print"))
        for q in queues:
            if q.get("comment", "").startswith(comment_prefix) or q.get("target", "") == ip:
                try:
                    api("/queue/simple/remove", **{"=.id": q[".id"]})
                except Exception:
                    pass

        # Remove firewall address list entry
        fw_entries = list(api("/ip/firewall/address-list/print", **{"?address": ip}))
        for fw in fw_entries:
            try:
                api("/ip/firewall/address-list/remove", **{"=.id": fw[".id"]})
            except Exception:
                pass

        # Remove ARP entry
        arp_entries = list(api("/ip/arp/print", **{"?address": ip}))
        for arp in arp_entries:
            try:
                api("/ip/arp/remove", **{"=.id": arp[".id"]})
            except Exception:
                pass

        api.close()
        return {"success": True, "message": f"Subscriber {ip} deactivated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/subscriber/pause")
def subscriber_pause(p: SubscriberIpPayload):
    """Block traffic for a subscriber by adding a firewall drop rule."""
    try:
        api = get_api()
        ip = p.ip_address
        comment = f"wibill-paused-{p.subscriber_id[:8]}"

        # Check if already blocked
        existing = list(api("/ip/firewall/filter/print", **{"?comment": comment}))
        if existing:
            api.close()
            return {"success": True, "message": f"Subscriber {ip} already blocked"}

        # Add drop rule for this subscriber's traffic
        api("/ip/firewall/filter/add", **{
            "=chain": "forward",
            "=src-address": ip,
            "=dst-address": ip,
            "=action": "drop",
            "=comment": comment,
            "=place-before": "0",
        })
        api.close()
        return {"success": True, "message": f"Traffic blocked for {ip}"}
    except TrapError as e:
        if "already" in str(e).lower():
            return {"success": True, "note": "already blocked"}
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/subscriber/resume")
def subscriber_resume(p: SubscriberIpPayload):
    """Unblock traffic for a subscriber by removing the firewall drop rule."""
    try:
        api = get_api()
        ip = p.ip_address
        comment_prefix = f"wibill-paused-{p.subscriber_id[:8]}"

        rules = list(api("/ip/firewall/filter/print"))
        removed = 0
        for r in rules:
            if r.get("comment", "").startswith(comment_prefix):
                try:
                    api("/ip/firewall/filter/remove", **{"=.id": r[".id"]})
                    removed += 1
                except Exception:
                    pass

        # Also remove any rules targeting this IP specifically
        for r in rules:
            if r.get("src-address") == ip or r.get("dst-address") == ip:
                if r.get("action") == "drop":
                    try:
                        api("/ip/firewall/filter/remove", **{"=.id": r[".id"]})
                        removed += 1
                    except Exception:
                        pass

        api.close()
        return {"success": True, "message": f"Traffic unblocked for {ip}", "rules_removed": removed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/subscriber/status")
def subscriber_status(ip: str):
    """Check if a subscriber's IP is online (ARP check + ping)."""
    try:
        api = get_api()
        result = {"ip": ip, "online": False, "method": "arp", "details": {}}

        # Method 1: Check ARP table
        arp = list(api("/ip/arp/print", **{"?address": ip}))
        if arp:
            result["online"] = True
            result["mac_address"] = arp[0].get("mac-address", "")
            result["interface"] = arp[0].get("interface", "")
            result["details"]["arp_status"] = arp[0].get("status", "")

        # Method 2: Check active PPPoE (if applicable)
        ppp_active = list(api("/ppp/active/print"))
        for p in ppp_active:
            if p.get("address") == ip:
                result["online"] = True
                result["method"] = "pppoe"
                result["details"]["ppp_user"] = p.get("name", "")
                result["details"]["ppp_uptime"] = p.get("uptime", "")
                break

        # Method 3: Try ICMP ping from router
        try:
            ping_res = list(api("/ping", **{"=address": ip, "=count": 1, "=interval": "100ms"}))
            for res in ping_res:
                if "received" in res:
                    result["details"]["ping_received"] = res.get("received", 0)
                    if int(res.get("received", 0)) > 0:
                        result["online"] = True
                        result["method"] = "ping"
        except Exception:
            pass

        api.close()
        return result
    except Exception as e:
        return {"ip": ip, "online": False, "error": str(e)}


@app.get("/health/batch")
def batch_health_check(ips: str = ""):
    """Check connectivity for multiple IPs (comma-separated). Returns ARP + ping status for each."""
    if not ips:
        return {"results": []}
    ip_list = [ip.strip() for ip in ips.split(",") if ip.strip()]
    results = []
    try:
        api = get_api()
        for ip in ip_list[:20]:  # Cap at 20 to avoid hammering the router
            r = {"ip": ip, "online": False, "method": "none", "details": {}}
            try:
                # ARP check
                arp = list(api("/ip/arp/print", **{"?address": ip}))
                if arp:
                    r["online"] = True
                    r["method"] = "arp"
                    r["mac_address"] = arp[0].get("mac-address", "")
                    r["interface"] = arp[0].get("interface", "")
                    r["details"]["arp_status"] = arp[0].get("status", "")
                # Ping if ARP failed
                if not r["online"]:
                    ping_res = list(api("/ping", **{"=address": ip, "=count": 1, "=interval": "100ms"}))
                    for res in ping_res:
                        if int(res.get("received", 0)) > 0:
                            r["online"] = True
                            r["method"] = "ping"
                            r["details"]["ping_received"] = res.get("received", 0)
            except Exception:
                pass
            results.append(r)
        api.close()
    except Exception:
        pass
    return {"results": results}


@app.get("/subscriber/queue")
def subscriber_queue(ip: str):
    """Get queue statistics for a subscriber."""
    try:
        api = get_api()
        queues = list(api("/queue/simple/print", **{"?target": ip}))
        api.close()

        if not queues:
            # Try matching by comment or name
            all_q = list(api("/queue/simple/print"))
            for q in all_q:
                if ip in q.get("target", ""):
                    queues = [q]
                    break

        if queues:
            q = queues[0]
            return {
                "success": True,
                "ip": ip,
                "queue_name": q.get("name", ""),
                "max_limit": q.get("max-limit", ""),
                "bytes_in": q.get("bytes", {}).get("in", 0),
                "bytes_out": q.get("bytes", {}).get("out", 0),
                "packets_in": q.get("packets", {}).get("in", 0),
                "packets_out": q.get("packets", {}).get("out", 0),
                "rate_in_bps": q.get("rate", {}).get("in", 0),
                "rate_out_bps": q.get("rate", {}).get("out", 0),
            }
        return {"success": True, "ip": ip, "queue_name": None, "bytes_in": 0, "bytes_out": 0}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/subscriber/reconcile")
def subscriber_reconcile():
    """
    Pull all configured static IP subscribers from the router.
    Used by the reconciliation background job to detect manual changes.
    """
    try:
        api = get_api()
        subscribers = []

        # Get queue-based subscribers (the authoritative source for static IP clients)
        queues = list(api("/queue/simple/print"))
        for q in queues:
            comment = q.get("comment", "")
            target = q.get("target", "")
            if "wibill-sub" in comment.lower() or "wibill" in comment.lower():
                subscribers.append({
                    "target": target,
                    "comment": comment,
                    "name": q.get("name", ""),
                    "max_limit": q.get("max-limit", ""),
                    "bytes_in": q.get("bytes", {}).get("in", 0),
                    "bytes_out": q.get("bytes", {}).get("out", 0),
                    "source": "queue",
                })
            elif target and "/" not in target:
                ip = target.split("/")[0]
                try:
                    ipaddress.ip_address(ip)
                    subscribers.append({
                        "target": target,
                        "comment": comment,
                        "name": q.get("name", ""),
                        "max_limit": q.get("max-limit", ""),
                        "bytes_in": q.get("bytes", {}).get("in", 0),
                        "bytes_out": q.get("bytes", {}).get("out", 0),
                        "source": "queue_single_ip",
                    })
                except ValueError:
                    pass

        # Get firewall address list entries
        fw_entries = list(api("/ip/firewall/address-list/print", **{"?list": "wibill-subscribers"}))
        for fw in fw_entries:
            addr = fw.get("address", "")
            exists = any(s.get("target", "").startswith(addr) for s in subscribers)
            if not exists:
                subscribers.append({
                    "address": addr,
                    "comment": fw.get("comment", ""),
                    "source": "firewall_address_list",
                })

        api.close()
        return {
            "success": True,
            "count": len(subscribers),
            "subscribers": subscribers,
        }
    except Exception as e:
        return {"success": False, "error": str(e), "subscribers": []}


class UpdateSchedulerPayload(BaseModel):
    poll_token: str
    poll_url: str
    ros_version: str = "6"


@app.post("/poll/update-scheduler")
def update_poll_scheduler(p: UpdateSchedulerPayload):
    """Regenerate the wibill-poll-script on the router with a fresh token.

    Removes the existing script + scheduler, re-creates them, and runs
    the script immediately so the router starts polling with the new token.
    """
    try:
        api = get_api()

        # Build the poll script body (same logic as build_poll_scheduler_block)
        mode = ""
        if p.ros_version == "6" and p.poll_url.lower().startswith("https"):
            mode = " mode=https"

        poll_script_body = (
            f'/tool fetch url="{p.poll_url}"'
            f' http-header-field="Authorization: Bearer {p.poll_token}"'
            f'{mode} dst-path=wibill-poll.rsc\n'
            f':do {{ /import wibill-poll.rsc }} on-error={{ :log info "wibill: poll import failed" }}'
        )

        # 1. Remove existing script and scheduler
        try:
            scripts = list(api("/system/script/print", **{"?name": "wibill-poll-script"}))
            for s in scripts:
                api("/system/script/remove", **{"=.id": s[".id"]})
        except Exception:
            pass

        try:
            schedulers = list(api("/system/scheduler/print", **{"?name": "wibill-poll"}))
            for s in schedulers:
                api("/system/scheduler/remove", **{"=.id": s[".id"]})
        except Exception:
            pass

        # 2. Add updated script
        api("/system/script/add", **{
            "=name": "wibill-poll-script",
            "=source": poll_script_body,
        })

        # 3. Add scheduler
        api("/system/scheduler/add", **{
            "=name": "wibill-poll",
            "=interval": "30s",
            "=on-event": "wibill-poll-script",
            "=start-time": "startup",
        })

        # 4. Run immediately
        try:
            api("/system/script/run", **{"=name": "wibill-poll-script"})
        except Exception:
            pass  # run may fail if script errors, but scheduler is installed

        api.close()
        return {"success": True, "message": "Poll scheduler updated with new token"}
    except FatalError as e:
        raise HTTPException(status_code=401, detail=f"Router auth failed: {e}")
    except OSError as e:
        raise HTTPException(status_code=503, detail=f"Cannot reach router: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    logger.info(f"Binding 127.0.0.1:8080 — bridge v{BRIDGE_VERSION}")
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="info")
