"""
poll.py — public router-facing endpoints for router-initiated polling.

The router's 30s scheduler job performs:

    GET  /poll/{router_id}          (Bearer <poll_token>)
         → a generated .rsc snippet of up to N pending RouterAction rows,
           with the ack call embedded so one import applies + acks.
         → marks those rows "delivered" and bumps Router.last_poll_at
           (the liveness signal).
    POST /poll/{router_id}/ack      (Bearer <poll_token>)
         → form-encoded ids=41,42; marks those rows "acked".

Auth is per-router: the token must match the specific router_id (Section 5).
"""
import hmac
import logging
import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.mikrotik_config import MikrotikConfig
from app.models.router_action import RouterAction
from app.services.crypto_service import decrypt
from app.services.router_poll_service import (
    build_identity_report_line,
    build_poll_snippet,
    MAX_ACTIONS_PER_POLL,
    resolve_ros_version,
)

logger = logging.getLogger("wibill.poll")

router = APIRouter()


def _notes_missing_identity(notes: str | None) -> bool:
    """True when notes don't pin a real Board/RouterOS value yet.

    "Real" means: a Board token exists and its value is not empty, not the
    literal "unknown", and not an unevaluated RouterOS command (the 6.x bug
    where ``{{/system resource get board-name}}`` was stored verbatim).
    """
    if not notes:
        return True
    m = re.search(r'\bBoard\s*:\s*([^|]+)', notes, flags=re.IGNORECASE)
    if not m:
        return True
    val = m.group(1).strip().lower()
    if not val or val == "unknown" or re.match(r'^\{+\[?/', val):
        return True
    return False


async def _load_and_authorize(router_id: str, request: Request, db: AsyncSession) -> MikrotikConfig:
    """Load a router by id and verify the per-router poll token."""
    try:
        rid = uuid.UUID(router_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail="Router not found")

    result = await db.execute(select(MikrotikConfig).where(MikrotikConfig.id == rid))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Router not found")

    header = request.headers.get("authorization", "")
    supplied = ""
    if header.lower().startswith("bearer "):
        supplied = header[7:].strip()

    if not config.poll_token_enc:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        expected = decrypt(config.poll_token_enc)
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not supplied or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")

    return config


# ── GET /poll/{router_id} ─────────────────────────────────────────────────
@router.get("/poll/{router_id}")
async def poll_actions(
    router_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Serve a .rsc snippet of the router's pending actions.

    Importing the returned script applies the actions and POSTs the ack back
    in a single pass. Zero pending actions yields a valid no-op script, never
    an empty response. last_poll_at is bumped on every successful poll —
    that is the router liveness signal.
    """
    config = await _load_and_authorize(router_id, request, db)

    result = await db.execute(
        select(RouterAction)
        .where(
            RouterAction.router_id == config.id,
            RouterAction.status == "pending",
        )
        .order_by(RouterAction.created_at.asc())
        .limit(MAX_ACTIONS_PER_POLL)
    )
    actions = list(result.scalars().all())

    now = datetime.utcnow()
    for action in actions:
        action.status = "delivered"
        action.delivered_at = now

    # Liveness: bump regardless of whether any actions were pending.
    config.last_poll_at = now
    # First-poll proof: stamp only the very first successful poll. The frontend
    # uses this to advance past REGISTERED to CONFIGURED once it has evidence
    # the 30s scheduler is genuinely running, not just that registration worked.
    if config.first_poll_at is None:
        config.first_poll_at = now
    await db.commit()

    # Build snippet after committing so delivered/acked transitions are not
    # re-included if the router immediately acks and polls again.
    ros = resolve_ros_version(config)
    script = build_poll_snippet(
        router_id=config.id,
        actions=actions,
        ros_version=ros,
        poll_token=decrypt(config.poll_token_enc),
    )

    # Until we have a real board name, smuggle an identity-report line into
    # every poll response. The router imports the snippet, so within one poll
    # cycle it POSTs its board-name + RouterOS version to /identity — no
    # bridge, no tunnel, no manual entry needed.
    if _notes_missing_identity(config.notes):
        identity_line = build_identity_report_line(
            router_id=config.id,
            poll_token=decrypt(config.poll_token_enc),
            ros_version=ros,
        )
        script = identity_line + "\n" + script

    logger.info(
        f"poll router={config.id} actions={[a.id for a in actions]} status={len(actions)}"
    )
    return PlainTextResponse(content=script, media_type="text/plain")


# ── POST /poll/{router_id}/ack ────────────────────────────────────────────
@router.post("/poll/{router_id}/ack")
async def ack_actions(
    router_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Mark delivered action ids as acked.

    Body is form-encoded (ids=41,42) because /tool fetch's http-data is a
    plain string, not JSON.
    """
    config = await _load_and_authorize(router_id, request, db)

    ids_raw = ""
    try:
        form = await request.form()
        ids_raw = (form.get("ids") or "").strip()
    except Exception:
        ids_raw = ""

    ids: list[int] = []
    for part in ids_raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except ValueError:
            continue

    if not ids:
        return PlainTextResponse(content="ok: nothing to ack", status_code=200)

    result = await db.execute(
        select(RouterAction).where(
            RouterAction.router_id == config.id,
            RouterAction.id.in_(ids),
        )
    )
    rows = result.scalars().all()
    now = datetime.utcnow()
    for action in rows:
        action.status = "acked"
        action.acked_at = now

    await db.commit()
    logger.info(f"ack router={config.id} ids={[a.id for a in rows]}")
    return PlainTextResponse(content=f"ok: acked {len(rows)}", status_code=200)


# ── POST /poll/{router_id}/identity ────────────────────────────────────────
@router.post("/poll/{router_id}/identity")
async def report_identity(
    router_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Receive the router's self-reported identity and persist it to notes.

    The poll snippet includes an identity-report fetch until notes pin a real
    Board name. The router POSTs form data ``ros_version``, ``board`` (and
    optionally ``mac``) with the same per-router Bearer token used for acking.
    Values are upserted into config.notes so the dashboard card (name + photo)
    resolves from real data instead of "unknown".
    """
    config = await _load_and_authorize(router_id, request, db)

    form = {}
    try:
        form = await request.form()
    except Exception:
        form = {}

    board = (form.get("board") or "").strip()
    version = (form.get("ros_version") or "").strip()
    mac = (form.get("mac") or "").strip()

    if not (board or version or mac):
        return PlainTextResponse(content="ok: nothing to report", status_code=200)

    prior = (config.notes or "").strip(" |")
    merged = prior

    def _upsert(value: str, key: str) -> None:
        nonlocal merged
        merged = re.sub(rf'\|\s*{key}\s*:\s*[^|]*', '', merged, flags=re.IGNORECASE).strip(" |")
        merged = f"{merged} | {key}: {value}".strip(" |")

    if board:
        _upsert(board, "Board")
    if version:
        _upsert(version, "RouterOS")
    if mac:
        _upsert(mac, "MAC")

    if merged != prior:
        config.notes = merged
        await db.commit()

    logger.info(f"identity router={config.id} board={board} ros={version}")
    return PlainTextResponse(content="ok: identity recorded", status_code=200)
