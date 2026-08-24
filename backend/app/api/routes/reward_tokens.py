import uuid
import secrets
import string
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from pydantic import BaseModel
from app.core.database import get_db
from app.models.reward_token import RewardToken
from app.models.session import Session
from app.api.routes.auth import get_current_user
from app.services.session_service import create_session, activate_session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["reward-tokens"])


class GenerateCompensationRequest(BaseModel):
    session_id: str
    minutes: int
    reason: str | None = None
    bound_phone: str | None = None
    bound_mac: str | None = None


class GenerateCampaignTokensRequest(BaseModel):
    campaign_id: str
    quantity: int
    minutes: int
    expiry_hours: int = 72
    bound_phone: str | None = None


class RedeemTokenRequest(BaseModel):
    token_code: str
    mac_address: str = ""
    ip_address: str = ""


def generate_token_code(length: int = 12) -> str:
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


@router.post("/generate-compensation")
async def generate_compensation_token(
    payload: GenerateCompensationRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    try:
        session_uuid = uuid.UUID(payload.session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    session_result = await db.execute(
        select(Session).where(Session.id == session_uuid, Session.tenant_id == tenant_id)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if payload.minutes < 5 or payload.minutes > 1440:
        raise HTTPException(status_code=400, detail="Compensation minutes must be between 5 and 1440")

    now = datetime.utcnow()

    # Extend the session's expires_at directly (the real fix)
    new_expires = (session.expires_at or now) + timedelta(minutes=payload.minutes)
    await db.execute(
        update(Session).where(Session.id == session_uuid).values(expires_at=new_expires)
    )

    # Update MikroTik user with new expiry if session is active
    if session.status == "active" and session.reconnect_code:
        try:
            from app.services.mikrotik_service import update_mikrotik_user
            await update_mikrotik_user(
                tenant_id=str(tenant_id),
                session_id=str(session.id),
                username=session.reconnect_code,
                new_expires_at=new_expires,
                db=db,
            )
        except Exception as e:
            logger.warning(f"MikroTik update failed during compensation: {e}")

    # Also create a reward token record for audit trail
    code = generate_token_code()
    while True:
        existing = await db.execute(select(RewardToken).where(RewardToken.token_code == code))
        if not existing.scalar_one_or_none():
            break
        code = generate_token_code()

    token = RewardToken(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        token_code=code,
        minutes=payload.minutes,
        bound_phone=payload.bound_phone,
        bound_mac=payload.bound_mac,
        session_id=session_uuid,
        reason=payload.reason or "compensation",
        redeemed=True,
        redeemed_at=now,
        expires_at=now + timedelta(days=30),
        created_at=now,
    )
    db.add(token)
    await db.commit()

    return {
        "token_id": str(token.id),
        "token_code": code,
        "minutes": payload.minutes,
        "new_expires_at": new_expires.isoformat() + "Z",
        "reason": token.reason,
        "message": f"Session extended by {payload.minutes} minutes. New expiry: {new_expires.strftime('%H:%M')}",
    }


@router.get("")
async def list_reward_tokens(
    redeemed: bool = None,
    search: str = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    query = select(RewardToken).where(RewardToken.tenant_id == tenant_id)
    if redeemed is not None:
        query = query.where(RewardToken.redeemed == redeemed)
    if search:
        query = query.where(RewardToken.token_code.ilike(f"%{search}%"))

    query = query.order_by(RewardToken.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    tokens = result.scalars().all()

    total = await db.execute(select(func.count(RewardToken.id)).where(RewardToken.tenant_id == tenant_id))
    total_count = total.scalar()

    return {
        "total": total_count,
        "tokens": [
            {
                "id": str(t.id),
                "token_code": t.token_code,
                "minutes": t.minutes,
                "campaign_id": str(t.campaign_id) if t.campaign_id else None,
                "redeemed": t.redeemed,
                "redeemed_at": t.redeemed_at.isoformat() if t.redeemed_at else None,
                "session_id": str(t.session_id) if t.session_id else None,
                "reason": t.reason,
                "expires_at": t.expires_at.isoformat(),
                "created_at": t.created_at.isoformat(),
            }
            for t in tokens
        ],
    }


@router.get("/{token_id}")
async def get_token(
    token_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    try:
        t_id = uuid.UUID(token_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid token_id")

    result = await db.execute(select(RewardToken).where(RewardToken.id == t_id, RewardToken.tenant_id == tenant_id))
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    return {
        "id": str(token.id),
        "token_code": token.token_code,
        "minutes": token.minutes,
        "bound_phone": token.bound_phone,
        "bound_mac": token.bound_mac,
        "redeemed": token.redeemed,
        "redeemed_at": token.redeemed_at.isoformat() if token.redeemed_at else None,
        "session_id": str(token.session_id) if token.session_id else None,
        "reason": token.reason,
        "expires_at": token.expires_at.isoformat(),
        "created_at": token.created_at.isoformat(),
    }


@router.post("/redeem")
async def redeem_token(
    payload: RedeemTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RewardToken).where(RewardToken.token_code == payload.token_code))
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    def _naive(dt):
        return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt
    now = datetime.utcnow()
    if token.redeemed:
        raise HTTPException(status_code=400, detail="Token already redeemed")
    if token.expires_at and _naive(token.expires_at) < now:
        raise HTTPException(status_code=400, detail="Token has expired")

    token.redeemed = True
    token.redeemed_at = now
    token.bound_mac = payload.mac_address or token.bound_mac

    duration = timedelta(minutes=token.minutes)
    session = await create_session(
        tenant_id=token.tenant_id,
        mac_address=payload.mac_address or "00:00:00:00:00:00",
        ip_address=payload.ip_address or "0.0.0.0",
        package_id=None,
        expires_at=now + duration,
        db=db,
    )
    await activate_session(session_id=str(session.id), db=db)

    token.session_id = session.id
    await db.commit()

    # Provision on MikroTik (non-blocking)
    from app.services.mikrotik_service import create_mikrotik_user, add_hotspot_bypass
    try:
        await create_mikrotik_user(
            tenant_id=str(token.tenant_id),
            session_id=str(session.id),
            mac_address=payload.mac_address or "00:00:00:00:00:00",
            ip_address=payload.ip_address or "0.0.0.0",
            username=session.reconnect_code,
            password=session.reconnect_code,
            expires_at=session.expires_at,
            db=db,
        )
    except Exception:
        pass

    # Queue ip-binding bypass
    if payload.mac_address and payload.mac_address != "00:00:00:00:00:00":
        try:
            await add_hotspot_bypass(
                tenant_id=str(token.tenant_id),
                mac_address=payload.mac_address,
                ip_address=payload.ip_address or "0.0.0.0",
                expires_at=session.expires_at,
                db=db,
            )
        except Exception:
            pass

    return {
        "success": True,
        "session_id": str(session.id),
        "minutes": token.minutes,
        "message": f"Token redeemed! {token.minutes} minutes of internet access activated.",
    }
