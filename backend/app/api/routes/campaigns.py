import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.core.database import get_db
from app.models.campaign import Campaign
from app.models.reward_token import RewardToken
from app.api.routes.auth import get_current_user

router = APIRouter(tags=["campaigns"])


class CreateCampaignRequest(BaseModel):
    name: str
    campaign_type: str = "win_back"
    reward_minutes: int = 30
    quantity: int = 100
    expiry_hours: int = 48
    target_filter: str | None = None


class UpdateCampaignStatusRequest(BaseModel):
    status: str


@router.post("")
async def create_campaign(
    payload: CreateCampaignRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    valid_types = ["win_back", "loyalty_reward", "engagement", "promotional"]
    if payload.campaign_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of: {', '.join(valid_types)}")

    if payload.reward_minutes < 5 or payload.reward_minutes > 1440:
        raise HTTPException(status_code=400, detail="reward_minutes must be between 5 and 1440")
    if payload.quantity < 1 or payload.quantity > 10000:
        raise HTTPException(status_code=400, detail="quantity must be between 1 and 10000")

    campaign = Campaign(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name=payload.name,
        campaign_type=payload.campaign_type,
        reward_minutes=payload.reward_minutes,
        quantity=payload.quantity,
        expiry_hours=payload.expiry_hours,
        target_filter=payload.target_filter,
        status="draft",
        created_at=datetime.utcnow(),
    )
    db.add(campaign)
    await db.commit()

    return {
        "id": str(campaign.id),
        "name": campaign.name,
        "type": campaign.campaign_type,
        "reward_minutes": campaign.reward_minutes,
        "quantity": campaign.quantity,
        "status": campaign.status,
    }


@router.get("")
async def list_campaigns(
    status: str = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    query = select(Campaign).where(Campaign.tenant_id == tenant_id)
    if status:
        query = query.where(Campaign.status == status)

    query = query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    campaigns = result.scalars().all()

    total = await db.execute(select(func.count(Campaign.id)).where(Campaign.tenant_id == tenant_id))
    total_count = total.scalar()

    return {
        "total": total_count,
        "campaigns": [
            {
                "id": str(c.id),
                "name": c.name,
                "campaign_type": c.campaign_type,
                "reward_minutes": c.reward_minutes,
                "quantity": c.quantity,
                "expiry_hours": c.expiry_hours,
                "status": c.status,
                "sent_count": c.sent_count,
                "redeemed_count": c.redeemed_count,
                "created_at": c.created_at.isoformat(),
                "launched_at": c.launched_at.isoformat() if c.launched_at else None,
            }
            for c in campaigns
        ],
    }


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    try:
        c_id = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id")

    result = await db.execute(select(Campaign).where(Campaign.id == c_id, Campaign.tenant_id == tenant_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    tokens_result = await db.execute(
        select(func.count(RewardToken.id)).where(RewardToken.campaign_id == c_id)
    )
    token_count = tokens_result.scalar()

    return {
        "id": str(campaign.id),
        "name": campaign.name,
        "campaign_type": campaign.campaign_type,
        "reward_minutes": campaign.reward_minutes,
        "quantity": campaign.quantity,
        "expiry_hours": campaign.expiry_hours,
        "status": campaign.status,
        "target_filter": campaign.target_filter,
        "sent_count": campaign.sent_count,
        "redeemed_count": campaign.redeemed_count,
        "token_count": token_count,
        "created_at": campaign.created_at.isoformat(),
        "launched_at": campaign.launched_at.isoformat() if campaign.launched_at else None,
    }


@router.patch("/{campaign_id}/status")
async def update_campaign_status(
    campaign_id: str,
    payload: UpdateCampaignStatusRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    try:
        c_id = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id")

    result = await db.execute(select(Campaign).where(Campaign.id == c_id, Campaign.tenant_id == tenant_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    valid_statuses = ["draft", "launched", "completed", "cancelled"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    campaign.status = payload.status
    if payload.status == "launched" and not campaign.launched_at:
        campaign.launched_at = datetime.utcnow()

    await db.commit()
    return {"message": f"Campaign status updated to {payload.status}", "status": campaign.status}


@router.post("/{campaign_id}/launch")
async def launch_campaign(
    campaign_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    try:
        c_id = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id")

    result = await db.execute(select(Campaign).where(Campaign.id == c_id, Campaign.tenant_id == tenant_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail=f"Campaign is already {campaign.status}")
    if campaign.quantity < 1:
        raise HTTPException(status_code=400, detail="Campaign has no quantity configured")

    import secrets
    import string
    def gen_code(length=12):
        chars = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(chars) for _ in range(length))

    now = datetime.utcnow()
    expires_at = now + timedelta(hours=campaign.expiry_hours)

    codes = set()
    attempts = 0
    while len(codes) < campaign.quantity and attempts < campaign.quantity * 5:
        code = gen_code()
        attempts += 1
        existing = await db.execute(select(RewardToken).where(RewardToken.token_code == code))
        if not existing.scalar_one_or_none():
            codes.add(code)

    if len(codes) < campaign.quantity:
        raise HTTPException(status_code=500, detail=f"Could not generate {campaign.quantity} unique codes")

    for code in codes:
        token = RewardToken(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            token_code=code,
            minutes=campaign.reward_minutes,
            campaign_id=c_id,
            reason=campaign.campaign_type,
            redeemed=False,
            expires_at=expires_at,
            created_at=now,
        )
        db.add(token)

    campaign.status = "launched"
    campaign.launched_at = now
    campaign.sent_count = campaign.quantity
    await db.commit()

    return {
        "message": f"Campaign launched with {campaign.quantity} tokens",
        "tokens_generated": len(codes),
        "expires_at": expires_at.isoformat(),
    }
