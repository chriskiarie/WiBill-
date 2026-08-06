from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.api.routes.auth import require_isp_admin, require_feature
from app.models.admin_user import AdminUser
from app.models.subscriber_plan import SubscriberPlan, ClientType
from app.models.tenant import Tenant

router = APIRouter(dependencies=[Depends(require_feature("has_monthly_subscribers"))])


class PlanCreate(BaseModel):
    name: str
    price_ksh: float
    bandwidth_down_mbps: int = 10
    bandwidth_up_mbps: int = 5
    client_type: str = "wifi"
    billing_cycle_days: int = 30
    display_order: int = 0
    description: str | None = None
    burst_enabled: bool = False
    burst_limit_down_mbps: int | None = None
    burst_limit_up_mbps: int | None = None
    priority_queue: int = 8


class PlanUpdate(BaseModel):
    name: str | None = None
    price_ksh: float | None = None
    bandwidth_down_mbps: int | None = None
    bandwidth_up_mbps: int | None = None
    client_type: str | None = None
    billing_cycle_days: int | None = None
    is_active: bool | None = None
    display_order: int | None = None
    description: str | None = None
    burst_enabled: bool | None = None
    burst_limit_down_mbps: int | None = None
    burst_limit_up_mbps: int | None = None
    priority_queue: int | None = None


@router.get("")
async def list_plans(
    client_type: str | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """List subscriber plans for the ISP."""
    query = select(SubscriberPlan).where(
        SubscriberPlan.tenant_id == current_user.tenant_id
    )
    if client_type:
        query = query.where(SubscriberPlan.client_type == client_type)
    if is_active is not None:
        query = query.where(SubscriberPlan.is_active == is_active)
    query = query.order_by(SubscriberPlan.display_order)
    result = await db.execute(query)
    plans = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "price_ksh": float(p.price_ksh),
            "bandwidth_down_mbps": p.bandwidth_down_mbps,
            "bandwidth_up_mbps": p.bandwidth_up_mbps,
            "client_type": p.client_type,
            "billing_cycle_days": p.billing_cycle_days,
            "is_active": p.is_active,
            "display_order": p.display_order,
            "burst_enabled": p.burst_enabled,
            "burst_limit_down_mbps": p.burst_limit_down_mbps,
            "burst_limit_up_mbps": p.burst_limit_up_mbps,
            "priority_queue": p.priority_queue,
        }
        for p in plans
    ]


@router.post("")
async def create_plan(
    data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Create a new subscriber plan."""
    if data.client_type not in ("wifi", "tv"):
        raise HTTPException(status_code=400, detail="client_type must be 'wifi' or 'tv'")

    plan = SubscriberPlan(
        id=uuid.uuid4(),
        tenant_id=current_user.tenant_id,
        name=data.name,
        description=data.description,
        price_ksh=data.price_ksh,
        bandwidth_down_mbps=data.bandwidth_down_mbps,
        bandwidth_up_mbps=data.bandwidth_up_mbps,
        client_type=data.client_type,
        billing_cycle_days=data.billing_cycle_days,
        display_order=data.display_order,
        burst_enabled=data.burst_enabled,
        burst_limit_down_mbps=data.burst_limit_down_mbps,
        burst_limit_up_mbps=data.burst_limit_up_mbps,
        priority_queue=data.priority_queue,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return {"id": str(plan.id), "name": plan.name, "price_ksh": float(plan.price_ksh)}


@router.patch("/{plan_id}")
async def update_plan(
    plan_id: str,
    data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Update a subscriber plan."""
    result = await db.execute(
        select(SubscriberPlan).where(
            SubscriberPlan.id == uuid.UUID(plan_id),
            SubscriberPlan.tenant_id == current_user.tenant_id,
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    await db.commit()
    return {"message": "Plan updated"}


@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Delete a subscriber plan."""
    result = await db.execute(
        select(SubscriberPlan).where(
            SubscriberPlan.id == uuid.UUID(plan_id),
            SubscriberPlan.tenant_id == current_user.tenant_id,
        )
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.delete(plan)
    await db.commit()
    return {"ok": True, "message": "Plan deleted"}
