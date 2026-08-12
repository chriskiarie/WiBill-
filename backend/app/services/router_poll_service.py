"""
router_poll_service.py — the router-initiated control plane.

The router pulls its own instructions on a 30s scheduler interval instead of
the backend pushing commands through the bridge-PC relay. Every poll:

    GET /poll/{router_id}   → returns a .rsc snippet rendering pending
                              RouterAction rows and embeds the ack fetch, so
                              importing the script applies actions AND acks
                              them in one pass.
    POST /poll/{router_id}/ack → marks the delivered action ids as "acked".

The router's own scheduler /tool fetch carries the per-router poll_token;
the fetched snippet embeds an acked ack call (with the same token header)
so no second scheduled step is needed.

This module holds the pure generation + queue logic. The HTTP endpoints live
in app/api/routes/poll.py.
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone as tz

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.mikrotik_config import MikrotikConfig
from app.models.router_action import RouterAction
from app.services.crypto_service import encrypt, decrypt

logger = logging.getLogger("wibill.poll")

POLL_INTERVAL_SECONDS = 30
STALE_AFTER_SECONDS = 3 * POLL_INTERVAL_SECONDS  # 3x missed intervals → offline
MAX_ACTIONS_PER_POLL = 20


# ── Router liveness (Section 8) ────────────────────────────────────────────
def router_status(router: MikrotikConfig) -> str:
    """Derive router connectivity from time since last poll.

    Fully replaces the bridge /health call: the router checking in on its
    own schedule IS the health check.
    """
    if router.last_poll_at is None:
        return "never_connected"
    last = router.last_poll_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=tz.utc)
    stale_after = timedelta(seconds=STALE_AFTER_SECONDS)
    if datetime.now(tz.utc) - last < stale_after:
        return "online"
    return "offline"


# ── Poll token management (Section 5) ─────────────────────────────────────
def ensure_poll_token(config: MikrotikConfig) -> str:
    """Return the router's poll token, generating + encrypting one if missing.

    Each router gets its own token at registration time; it is written into
    the router's scheduler config during onboarding. A leaked token exposes
    only that one router's action queue.
    """
    if config.poll_token_enc:
        try:
            return decrypt(config.poll_token_enc)
        except Exception:
            logger.warning(f"Could not decrypt poll token for router {config.id} — regenerating")
    token = secrets.token_urlsafe(32)
    config.poll_token_enc = encrypt(token)
    return token


# ── Action queue ──────────────────────────────────────────────────────────
async def enqueue_action(
    router_id,
    action_type: str,
    payload: dict,
    db: AsyncSession,
    commit: bool = True,
) -> RouterAction:
    """Enqueue a RouterAction row for the router to pick up on its next poll."""
    action = RouterAction(
        router_id=router_id,
        action_type=action_type,
        payload=payload or {},
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(action)
    if commit:
        await db.commit()
        await db.refresh(action)
    return action


def resolve_ros_version(config: MikrotikConfig | None = None) -> str:
    """Best-effort RouterOS major version ("6" or "7") for syntax differences.

    Falls back to "6" (the documented snippet form includes mode=https, which
    is the legacy-but-still-valid syntax) when the version can't be resolved.
    """
    if config is not None and config.notes:
        notes = config.notes or ""
        for token in notes.split("|"):
            token = token.strip()
            if token.lower().startswith("routeros"):
                ver = token.split(":", 1)[-1].strip()
                major = ver.split(".")[0]
                if major in ("6", "7"):
                    return major
    return "6"


def _fetch_mode(ros_version: str, url: str = "") -> str:
    """RouterOS 6.x needs an explicit mode=https for https fetch."""
    if ros_version == "7":
        return ""
    if url.lower().startswith("https"):
        return " mode=https"
    return ""


def _mac_clean(mac: str) -> str:
    return (mac or "").strip().upper()


def _render_add_bypass(action: RouterAction) -> str:
    mac = _mac_clean(action.payload.get("mac_address", ""))
    comment = f"wibill-action-{action.id}"
    if not mac:
        return f':log info "wibill: skip add_bypass {action.id} — no mac"'
    # Idempotent: update the entry tagged with this action id, else create it.
    return (
        f':do {{ :if ([:len [/ip hotspot ip-binding find comment="{comment}"]] > 0) '
        f'do={{ /ip hotspot ip-binding set [find comment="{comment}"] mac-address="{mac}" type=bypass }} '
        f'else={{ /ip hotspot ip-binding add mac-address="{mac}" type=bypass comment="{comment}" }} }} on-error={{ }}'
    )


def _render_remove_bypass(action: RouterAction) -> str:
    mac = _mac_clean(action.payload.get("mac_address", ""))
    if not mac:
        return f':log info "wibill: skip remove_bypass {action.id} — no mac"'
    return f':do {{ /ip hotspot ip-binding remove [find mac-address="{mac}"] }} on-error={{ }}'


def _render_push_portal(action: RouterAction, ros_version: str) -> str:
    url = (action.payload.get("url") or "").strip()
    dst = action.payload.get("dst") or "hotspot/login.html"
    if not url:
        return f':log info "wibill: skip push_portal {action.id} — no url"'
    return (
        f':do {{ /tool fetch url="{url}"{_fetch_mode(ros_version, url)} dst-path={dst} }} on-error={{ }}'
    )


def render_action_line(action: RouterAction, ros_version: str) -> str:
    if action.action_type == "add_bypass":
        return _render_add_bypass(action)
    if action.action_type == "remove_bypass":
        return _render_remove_bypass(action)
    if action.action_type == "push_portal":
        return _render_push_portal(action, ros_version)
    return f':log info "wibill: unknown action {action.action_type} ({action.id})"'


def build_poll_snippet(
    router_id,
    actions: list[RouterAction],
    ros_version: str = "6",
    poll_token: str = "",
    base_url: str = "",
) -> str:
    """Generate the .rsc snippet returned by GET /poll/{router_id}.

    The ack call is embedded inside the returned script itself — the router
    doesn't need a second scheduled step; importing the script applies the
    actions and reports success in one pass. Zero pending actions still
    returns a valid no-op script, never an empty response.
    """
    base = (base_url or settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).rstrip("/")
    ack_url = f"{base}/poll/{router_id}/ack"

    lines: list[str] = []
    ids: list[int] = []
    for action in actions:
        lines.append(render_action_line(action, ros_version))
        ids.append(action.id)

    if not ids:
        return ':log info "wibill: no pending actions"'

    ids_str = ",".join(str(i) for i in ids)
    auth = f' http-header-field="Authorization: Bearer {poll_token}"' if poll_token else ""
    ack_line = (
        f':tool fetch url="{ack_url}" http-method=post{auth} http-data="ids={ids_str}"{_fetch_mode(ros_version, ack_url)}'
    )
    return "\n".join(lines) + "\n" + ack_line + "\n"


def build_poll_scheduler_block(
    router_id,
    poll_token: str,
    ros_version: str = "6",
    base_url: str = "",
) -> str:
    """RouterOS .rsc snippet that installs the 30s poll scheduler job.

    This is appended to the onboarding .rsc script so the router starts
    pulling its own instructions with no additional setup. Scheduler syntax
    is stable across RouterOS 6.x and 7.x; only the /tool fetch line differs.
    """
    base = (base_url or settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).rstrip("/")
    poll_url = f"{base}/poll/{router_id}"
    mode = _fetch_mode(ros_version, poll_url)

    # The poll script lives on one line inside source="..."; RouterOS
    # interprets \n escapes inside double-quoted strings, so we keep the
    # script body as a single physical line joined with \n.
    poll_script_body = (
        f"/tool fetch url=\"{poll_url}\""
        f" http-header-field=\"Authorization: Bearer {poll_token}\""
        f"{mode} dst-path=wibill-poll.rsc\n"
        f":do {{ /import wibill-poll.rsc }} on-error={{ :log info \"wibill: poll import failed\" }}"
    )
    escaped = poll_script_body.replace('"', '\\"')

    return (
        "\n# ── WiBill poll scheduler (30s) ─────────────────────────────────\n"
        f"/system script add name=wibill-poll-script source=\"{escaped}\"\n"
        "/system scheduler add name=wibill-poll interval=30s on-event=wibill-poll-script start-time=startup\n"
        ":do { /system script run wibill-poll-script } on-error={ }\n"
    )
