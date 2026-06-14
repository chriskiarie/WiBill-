import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
from app.core.database import get_db
from app.models.loyalty_account import LoyaltyAccount, LoyaltyTransaction
from app.models.tenant import Tenant
from app.models.session import Session
from app.api.routes.auth import get_current_user
from app.services.session_service import create_session

router = APIRouter(tags=["loyalty"])


POINTS_PER_100_KES = 10
REDEMPTION_THRESHOLD_POINTS = 100
REDEMPTION_DURATION_HOURS = 1


class LoyaltyConfig(BaseModel):
    points_per_100_kes: int = 10
    redemption_threshold_points: int = 100
    redemption_duration_hours: int = 1


@router.get("/config")
async def get_loyalty_config():
    return {
        "points_per_100_kes": POINTS_PER_100_KES,
        "redemption_threshold_points": REDEMPTION_THRESHOLD_POINTS,
        "redemption_duration_hours": REDEMPTION_DURATION_HOURS,
    }


@router.post("/config")
async def update_loyalty_config(payload: LoyaltyConfig):
    return {
        "points_per_100_kes": payload.points_per_100_kes,
        "redemption_threshold_points": payload.redemption_threshold_points,
        "redemption_duration_hours": payload.redemption_duration_hours,
    }


@router.get("/accounts")
async def list_loyalty_accounts(
    search: str = None,
    sort_by: str = "total_spent_ksh",
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    query = select(LoyaltyAccount).where(LoyaltyAccount.tenant_id == tenant_id)

    if search:
        query = query.where(LoyaltyAccount.phone_number.ilike(f"%{search}%"))

    sort_map = {
        "total_spent_ksh": LoyaltyAccount.total_spent_ksh.desc(),
        "points_balance": LoyaltyAccount.points_balance.desc(),
        "lifetime_sessions": LoyaltyAccount.lifetime_sessions.desc(),
        "last_activity_at": LoyaltyAccount.last_activity_at.desc().nullslast(),
    }
    query = query.order_by(sort_map.get(sort_by, LoyaltyAccount.total_spent_ksh.desc()))
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    accounts = result.scalars().all()

    total = await db.execute(select(func.count(LoyaltyAccount.id)).where(LoyaltyAccount.tenant_id == tenant_id))
    total_count = total.scalar()

    return {
        "total": total_count,
        "accounts": [
            {
                "id": str(a.id),
                "phone_number": a.phone_number,
                "points_balance": a.points_balance,
                "total_points_earned": a.total_points_earned,
                "total_redeemed": a.total_redeemed,
                "total_spent_ksh": float(a.total_spent_ksh),
                "lifetime_sessions": a.lifetime_sessions,
                "created_at": a.created_at.isoformat(),
                "last_activity_at": a.last_activity_at.isoformat() if a.last_activity_at else None,
            }
            for a in accounts
        ],
    }


@router.get("/accounts/{phone}")
async def get_loyalty_account(
    phone: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    result = await db.execute(
        select(LoyaltyAccount).where(
            LoyaltyAccount.tenant_id == tenant_id,
            LoyaltyAccount.phone_number == phone
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Loyalty account not found for this phone")

    txns_result = await db.execute(
        select(LoyaltyTransaction).where(LoyaltyTransaction.account_id == account.id)
        .order_by(LoyaltyTransaction.created_at.desc())
        .limit(50)
    )
    transactions = txns_result.scalars().all()

    return {
        "account": {
            "id": str(account.id),
            "phone_number": account.phone_number,
            "points_balance": account.points_balance,
            "total_points_earned": account.total_points_earned,
            "total_redeemed": account.total_redeemed,
            "total_spent_ksh": float(account.total_spent_ksh),
            "lifetime_sessions": account.lifetime_sessions,
            "created_at": account.created_at.isoformat(),
            "last_activity_at": account.last_activity_at.isoformat() if account.last_activity_at else None,
        },
        "transactions": [
            {
                "id": str(t.id),
                "type": t.type,
                "points": t.points,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            }
            for t in transactions
        ],
    }


@router.get("/stats")
async def get_loyalty_stats(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    result = await db.execute(select(func.count(LoyaltyAccount.id)).where(LoyaltyAccount.tenant_id == tenant_id))
    total_enrolled = result.scalar()

    balance_result = await db.execute(
        select(func.coalesce(func.sum(LoyaltyAccount.points_balance), 0))
        .where(LoyaltyAccount.tenant_id == tenant_id)
    )
    total_points_outstanding = balance_result.scalar()

    redeemed_result = await db.execute(
        select(func.coalesce(func.sum(LoyaltyAccount.total_redeemed), 0))
        .where(LoyaltyAccount.tenant_id == tenant_id)
    )
    total_points_redeemed = redeemed_result.scalar()

    spent_result = await db.execute(
        select(func.coalesce(func.sum(LoyaltyAccount.total_spent_ksh), 0))
        .where(LoyaltyAccount.tenant_id == tenant_id)
    )
    total_lifetime_spent = float(spent_result.scalar())

    top_result = await db.execute(
        select(LoyaltyAccount).where(LoyaltyAccount.tenant_id == tenant_id)
        .order_by(LoyaltyAccount.total_spent_ksh.desc()).limit(10)
    )
    top_customers = top_result.scalars().all()

    return {
        "total_enrolled": total_enrolled,
        "total_points_outstanding": total_points_outstanding,
        "total_points_redeemed": total_points_redeemed,
        "total_lifetime_spent_ksh": total_lifetime_spent,
        "top_customers": [
            {
                "phone_number": c.phone_number,
                "total_spent_ksh": float(c.total_spent_ksh),
                "points_balance": c.points_balance,
                "lifetime_sessions": c.lifetime_sessions,
            }
            for c in top_customers
        ],
    }


@router.post("/award-points")
async def award_loyalty_points(
    phone_number: str,
    amount_ksh: float,
    session_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    points_earned = int(amount_ksh / 100) * POINTS_PER_100_KES

    result = await db.execute(
        select(LoyaltyAccount).where(
            LoyaltyAccount.tenant_id == tenant_id,
            LoyaltyAccount.phone_number == phone_number
        )
    )
    account = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if not account:
        account = LoyaltyAccount(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            phone_number=phone_number,
            points_balance=0,
            total_points_earned=0,
            total_redeemed=0,
            total_spent_ksh=0,
            lifetime_sessions=0,
            created_at=now,
        )
        db.add(account)

    account.points_balance += points_earned
    account.total_points_earned += points_earned
    account.total_spent_ksh = float(account.total_spent_ksh) + amount_ksh
    account.lifetime_sessions += 1
    account.last_activity_at = now

    txn = LoyaltyTransaction(
        id=uuid.uuid4(),
        account_id=account.id,
        type="earn",
        points=points_earned,
        description=f"Awarded {points_earned} points for KES {amount_ksh} spend",
        session_id=uuid.UUID(session_id) if session_id else None,
        created_at=now,
    )
    db.add(txn)
    await db.commit()

    return {
        "points_earned": points_earned,
        "points_balance": account.points_balance,
        "total_points_earned": account.total_points_earned,
    }


@router.post("/redeem")
async def redeem_loyalty_points(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    raise HTTPException(status_code=501, detail="Portal redemption is a public endpoint. Use POST /api/vouchers/redeem-loyalty")


@router.post("/redeem-portal")
async def redeem_loyalty_portal(
    phone_number: str,
    mac_address: str = "",
    ip_address: str = "",
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LoyaltyAccount, Tenant)
        .join(Tenant, LoyaltyAccount.tenant_id == Tenant.id)
        .where(LoyaltyAccount.phone_number == phone_number)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="No loyalty account found for this phone number")

    account, tenant = row

    if account.points_balance < REDEMPTION_THRESHOLD_POINTS:
        raise HTTPException(
            status_code=400,
            detail=f"Need {REDEMPTION_THRESHOLD_POINTS} points to redeem. You have {account.points_balance}."
        )

    now = datetime.now(timezone.utc)

    session = await create_session(
        tenant_id=account.tenant_id,
        mac_address=mac_address,
        ip_address=ip_address,
        package_id=None,
        expires_at=now + timedelta(hours=REDEMPTION_DURATION_HOURS),
        db=db,
    )

    account.points_balance -= REDEMPTION_THRESHOLD_POINTS
    account.total_redeemed += REDEMPTION_THRESHOLD_POINTS
    account.last_activity_at = now

    txn = LoyaltyTransaction(
        id=uuid.uuid4(),
        account_id=account.id,
        type="redeem",
        points=REDEMPTION_THRESHOLD_POINTS,
        description=f"Redeemed {REDEMPTION_THRESHOLD_POINTS} points for {REDEMPTION_DURATION_HOURS}h free internet",
        session_id=session.id,
        created_at=now,
    )
    db.add(txn)
    await db.commit()

    return {
        "success": True,
        "session_id": str(session.id),
        "duration_hours": REDEMPTION_DURATION_HOURS,
        "points_remaining": account.points_balance,
        "message": f"Free {REDEMPTION_DURATION_HOURS}h internet activated! {REDEMPTION_THRESHOLD_POINTS} points redeemed.",
    }
