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
STALE_AFTER_SECONDS = 5 * POLL_INTERVAL_SECONDS  # 5x missed intervals → offline (~2.5 min)
MAX_ACTIONS_PER_POLL = 20

# Extra walled-garden hosts every ISP router needs so captive phones load
# the portal fonts the wizard advertises (font unity between admin preview
# and the phone). The portal host itself is always allowed separately.
WALLED_GARDEN_EXTRA_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"]


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
            logger.warning(
                f"Could not decrypt poll token for router {config.id} — "
                f"encryption key may have changed. Marking token as invalid."
            )
            config.token_valid = False
    token = secrets.token_urlsafe(32)
    config.poll_token_enc = encrypt(token)
    config.token_valid = False  # New token — router still has old one
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


def build_portal_fetch_line(
    slug: str,
    ros_version: str = "6",
    base_url: str = "",
    dst_path: str = "hotspot/login.html",
) -> str:
    """One-line installation of the tenant's login.html redirect stub.

    The router /tool fetches the stub straight from WiBill's server (same way
    it fetches the onboarding script) — no local PC, no staging folder. This is
    folded into the fresh-router setup script so an initial portal push never
    needs a separate step.
    """
    base = (base_url or settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).rstrip("/")
    url = f"{base}/login/{slug}"
    mode = _fetch_mode(ros_version, url)
    return f':do {{ /tool fetch url="{url}"{mode} dst-path={dst_path} }} on-error={{ :log info "wibill: portal fetch failed" }}'


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


def _render_add_walled_garden(action: RouterAction) -> str:
    """Idempotent walled-garden additions (duplicates are harmless in RouterOS)."""
    hosts = action.payload.get("hosts") or WALLED_GARDEN_EXTRA_HOSTS
    lines = [
        f':do {{ /ip hotspot walled-garden add dst-host={h} action=allow }} on-error={{ }}'
        for h in hosts
        if isinstance(h, str) and h.strip()
    ]
    return "\n".join(lines) if lines else f':log info "wibill: skip add_walled_garden {action.id} — no hosts"'


def _render_reset_walled_garden(action: RouterAction) -> str:
    """Safe walled-garden reset: add correct entries (idempotent).

    Previously this removed ALL entries first, then re-added — if the adds
    failed (network blip, script timeout, on-error swallowing), the router
    was left with ZERO entries, blocking all captive portal traffic.

    New approach: just add the correct entries. Duplicates are harmless in
    RouterOS. Old/wrong entries (e.g. mikrotik.wi-bill.com) are benign —
    they allow traffic to domains that don't exist. No connectivity is ever
    lost.
    """
    hosts = action.payload.get("hosts") or WALLED_GARDEN_EXTRA_HOSTS
    add_lines = [
        f':do {{ /ip hotspot walled-garden add dst-host={h} action=allow }} on-error={{ }}'
        for h in hosts
        if isinstance(h, str) and h.strip()
    ]
    return "\n".join(add_lines) if add_lines else f':log info "wibill: skip reset_walled_garden {action.id} — no hosts"'


def render_action_line(action: RouterAction, ros_version: str) -> str:
    if action.action_type == "add_bypass":
        return _render_add_bypass(action)
    if action.action_type == "remove_bypass":
        return _render_remove_bypass(action)
    if action.action_type == "push_portal":
        return _render_push_portal(action, ros_version)
    if action.action_type == "add_walled_garden":
        return _render_add_walled_garden(action)
    if action.action_type == "reset_walled_garden":
        return _render_reset_walled_garden(action)
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


def build_identity_report_line(
    router_id,
    poll_token: str = "",
    ros_version: str = "6",
    base_url: str = "",
) -> str:
    """Fire-and-forget line that makes the router report its identity.

    Served inside the poll snippet (and hence imported by the router every
    30s) until the backend has a real Board/RouterOS value in notes. Uses the
    same explicit :local + string concatenation pattern as build_onboard_script
    — RouterOS 6.x does not reliably evaluate inline {[command]} expressions
    inside /tool fetch http-data.
    """
    base = (base_url or settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).rstrip("/")
    url = f"{base}/poll/{router_id}/identity"
    mode = _fetch_mode(ros_version, url)
    auth = f' http-header-field="Authorization: Bearer {poll_token}"' if poll_token else ""
    return (
        ':local wbVer [/system resource get version]\n'
        ':local wbBoard [/system resource get board-name]\n'
        f':do {{ /tool fetch url="{url}"{mode}{auth} http-method=post '
        'http-data=("ros_version=" . $wbVer . "&board=" . $wbBoard) } on-error={ }'
    )


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

    router_id and poll_token are baked in as LITERALS — never as variables.
    The result is a single /system script add whose source argument carries
    the whole poll script. Two layers of parsing happen, so escaping matters:

      Layer 1 (the .rsc file the router imports): a normal script line, so
        real quotes become \", real newlines become \\n (the escape form is
        what RouterOS wants for the *stored* script).
      Layer 2 (the stored wibill-poll-script that runs every 30s): RouterOS
        interprets those \" / \\n escapes and the script must then be valid
        RouterOS on its own — a fetch line + an import line.

    Steps to build the source argument correctly:
      1. Build the poll script BODY with real newlines + real quotes (this is
         exactly what the stored script will contain).
      2. Escape real quotes -> \" and real newlines -> \\n for the source=
         argument. Do NOT pre-double backslashes beyond that, or the stored
         script would contain literal "\n" backslash sequences instead of
         line breaks.
    """
    base = (base_url or settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).rstrip("/")
    poll_url = f"{base}/poll/{router_id}"
    mode = _fetch_mode(ros_version, poll_url)

    # The exact content that will be STORED as wibill-poll-script: two lines,
    # real newline between them, real quotes.
    poll_script_body = (
        f"/tool fetch url=\"{poll_url}\""
        f" http-header-field=\"Authorization: Bearer {poll_token}\""
        f"{mode} dst-path=wibill-poll.rsc\n"
        f":do {{ /import wibill-poll.rsc }} on-error={{ :log info \"wibill: poll import failed\" }}"
    )
    # Escape for embedding inside the source="..." argument of the .rsc importer.
    escaped = poll_script_body.replace('"', '\\"').replace("\n", "\\n")

    return (
        "# WiBill poll scheduler (30s)\n"
        f"/system script add name=wibill-poll-script source=\"{escaped}\"\n"
        "/system scheduler add name=wibill-poll interval=30s on-event=wibill-poll-script start-time=startup\n"
        ":do { /system script run wibill-poll-script } on-error={ }\n"
    )


def build_onboard_script(
    register_url: str,
    router_id,
    poll_token: str,
    ros_version: str = "6",
    base_url: str = "",
    tenant_name: str = "WiBill ISP",
) -> str:
    """Compose the full onboarding .rsc the router fetches from GET /onboard/{token}.

    router_id and poll_token are baked in as literals. The script carries NO
    variables and does NO structured/JSON parsing, so it runs identically on
    RouterOS 6.x and 7.x (the documented reason the original design served a
    ready-to-run .rsc instead of JSON). The registration POST is fire-and-
    forget: the backend already knows router_id + poll_token from token
    generation, so the response is intentionally ignored.
    """
    base = (base_url or settings.PUBLIC_BACKEND_URL or settings.PUBLIC_BASE_URL).rstrip("/")
    mode = _fetch_mode(ros_version, register_url)

    # Use explicit :local variable assignments instead of inline {[command]}
    # expressions.  RouterOS 6.x does not reliably evaluate inline expressions
    # inside /tool fetch http-data; the router would send back literal
    # "{[/system resource get version]}" instead of the resolved value.
    # Explicit :local + string concatenation works on both 6.x and 7.x.
    scheduler_block = build_poll_scheduler_block(router_id, poll_token, ros_version, base)

    parts = [
        ":local version [/system resource get version]",
        ":local board [/system resource get board-name]",
        ":local mac [/interface get [find default] mac-address]",
        ":local existingHotspot \"false\"",
        ":if ([/ip hotspot find] != \"\") do={:set existingHotspot \"true\"}",
        f'/tool fetch url="{register_url}"{mode} \\',
        '    http-method=post \\',
        '    http-data=("ros_version=" . $version . "&board=" . $board . "&mac=" . $mac . "&existing_hotspot=" . $existingHotspot)',
        f':log info "WiBill onboarding registration sent for {tenant_name}"',
        scheduler_block,
    ]
    return "\n".join(parts) + "\n"
