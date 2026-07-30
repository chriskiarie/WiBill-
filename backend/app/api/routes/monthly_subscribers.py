from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.subscriber import Subscriber
from app.models.subscriber_plan import SubscriberPlan
from app.services.subscriber_service import (
    create_subscriber,
    update_subscriber,
    get_subscriber,
    list_subscribers,
    pause_subscriber,
    suspend_subscriber,
    resume_subscriber,
    activate_subscriber,
    get_available_ips,
    reconcile_with_router,
    reconnect_subscriber_action,
    restart_subscriber_action,
)

router = APIRouter()


class SubscriberCreate(BaseModel):
    plan_id: str | None = None
    client_name: str
    phone_number: str
    networking_ip: str
    networking_mac: str | None = None
    networking_vlan: int | None = None
    networking_interface: str | None = None
    networking_gateway: str | None = None
    id_number: str | None = None
    email: str | None = None
    installation_address: str | None = None
    notes: str | None = None
    billing_cycle_date: int = 1
    billing_cycle_days: int = 30
    data_cap_gb: float | None = None


class SubscriberUpdate(BaseModel):
    plan_id: str | None = None
    client_name: str | None = None
    phone_number: str | None = None
    networking_ip: str | None = None
    networking_mac: str | None = None
    networking_vlan: int | None = None
    networking_interface: str | None = None
    networking_gateway: str | None = None
    id_number: str | None = None
    email: str | None = None
    installation_address: str | None = None
    notes: str | None = None
    billing_cycle_date: int | None = None
    data_cap_gb: float | None = None


def _subscriber_to_dict(s: Subscriber, plan_name: str | None = None) -> dict:
    return {
        "id": str(s.id),
        "tenant_id": str(s.tenant_id),
        "plan_id": str(s.plan_id) if s.plan_id else None,
        "plan_name": plan_name,
        "account_number": s.account_number,
        "client_name": s.client_name,
        "phone_number": s.phone_number,
        "id_number": s.id_number,
        "email": s.email,
        "installation_address": s.installation_address,
        "installation_date": s.installation_date.isoformat() if s.installation_date else None,
        "notes": s.notes,
        "networking_ip": s.networking_ip,
        "networking_mac": s.networking_mac,
        "networking_vlan": s.networking_vlan,
        "networking_interface": s.networking_interface,
        "networking_gateway": s.networking_gateway,
        "billing_cycle_date": s.billing_cycle_date,
        "billing_cycle_days": s.billing_cycle_days,
        "next_billing_at": s.next_billing_at.isoformat() if s.next_billing_at else None,
        "amount_due_ksh": float(s.amount_due_ksh),
        "status": s.status,
        "online_status": s.online_status,
        "last_seen_at": s.last_seen_at.isoformat() if s.last_seen_at else None,
        "data_cap_gb": float(s.data_cap_gb) if s.data_cap_gb else None,
        "data_used_today_gb": float(s.data_used_today_gb),
        "data_used_month_gb": float(s.data_used_month_gb),
        "data_used_total_gb": float(s.data_used_total_gb),
        "last_sync_at": s.last_sync_at.isoformat() if s.last_sync_at else None,
        "last_sync_status": s.last_sync_status,
        "out_of_sync": s.out_of_sync,
        "out_of_sync_note": s.out_of_sync_note,
        "mpesa_receipt_last": s.mpesa_receipt_last,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


@router.get("")
async def list_all_subscribers(
    status: str | None = None,
    client_type: str | None = None,
    search: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """List monthly subscribers with optional filters."""
    subscribers, total = await list_subscribers(
        tenant_id=current_user.tenant_id,
        status=status,
        client_type=client_type,
        search=search,
        skip=skip,
        limit=limit,
        db=db,
    )

    # Build plan name map
    plan_ids = [s.plan_id for s in subscribers if s.plan_id]
    plan_map = {}
    if plan_ids:
        plan_result = await db.execute(
            select(SubscriberPlan).where(SubscriberPlan.id.in_(plan_ids))
        )
        for p in plan_result.scalars().all():
            plan_map[str(p.id)] = p.name

    return {
        "items": [_subscriber_to_dict(s, plan_map.get(str(s.plan_id))) for s in subscribers],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/stats")
async def subscriber_stats(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Dashboard stats for monthly subscribers."""
    tid = current_user.tenant_id

    total_result = await db.execute(
        select(func.count(Subscriber.id)).where(Subscriber.tenant_id == tid)
    )
    total = total_result.scalar() or 0

    active_result = await db.execute(
        select(func.count(Subscriber.id)).where(
            Subscriber.tenant_id == tid,
            Subscriber.status == "active",
        )
    )
    active = active_result.scalar() or 0

    suspended_result = await db.execute(
        select(func.count(Subscriber.id)).where(
            Subscriber.tenant_id == tid,
            Subscriber.status == "suspended",
        )
    )
    suspended = suspended_result.scalar() or 0

    paused_result = await db.execute(
        select(func.count(Subscriber.id)).where(
            Subscriber.tenant_id == tid,
            Subscriber.status == "paused",
        )
    )
    paused = paused_result.scalar() or 0

    overdue_result = await db.execute(
        select(func.count(Subscriber.id)).where(
            Subscriber.tenant_id == tid,
            Subscriber.status == "overdue",
        )
    )
    overdue = overdue_result.scalar() or 0

    online_result = await db.execute(
        select(func.count(Subscriber.id)).where(
            Subscriber.tenant_id == tid,
            Subscriber.online_status == "online",
        )
    )
    online = online_result.scalar() or 0

    data_result = await db.execute(
        select(func.sum(Subscriber.data_used_month_gb)).where(
            Subscriber.tenant_id == tid,
        )
    )
    total_data_gb = float(data_result.scalar() or 0)

    return {
        "total": total,
        "active": active,
        "suspended": suspended,
        "paused": paused,
        "overdue": overdue,
        "online": online,
        "total_data_gb_month": total_data_gb,
    }


@router.get("/{subscriber_id}")
async def get_subscriber_by_id(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get a single subscriber."""
    try:
        sid = uuid.UUID(subscriber_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscriber ID")

    sub = await get_subscriber(sid, current_user.tenant_id, db)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    plan_name = None
    if sub.plan_id:
        plan_result = await db.execute(
            select(SubscriberPlan).where(SubscriberPlan.id == sub.plan_id)
        )
        plan = plan_result.scalar_one_or_none()
        plan_name = plan.name if plan else None

    return _subscriber_to_dict(sub, plan_name)


@router.post("")
async def create_new_subscriber(
    data: SubscriberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Create a new monthly subscriber."""
    plan_id = uuid.UUID(data.plan_id) if data.plan_id else None

    try:
        sub = await create_subscriber(
            tenant_id=current_user.tenant_id,
            plan_id=plan_id,
            client_name=data.client_name,
            phone_number=data.phone_number,
            networking_ip=data.networking_ip,
            networking_mac=data.networking_mac,
            networking_vlan=data.networking_vlan,
            networking_interface=data.networking_interface,
            networking_gateway=data.networking_gateway,
            id_number=data.id_number,
            email=data.email,
            installation_address=data.installation_address,
            notes=data.notes,
            billing_cycle_date=data.billing_cycle_date,
            billing_cycle_days=data.billing_cycle_days,
            data_cap_gb=data.data_cap_gb,
            db=db,
        )
        return _subscriber_to_dict(sub)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{subscriber_id}")
async def update_subscriber_by_id(
    subscriber_id: str,
    data: SubscriberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Update a subscriber."""
    try:
        sid = uuid.UUID(subscriber_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscriber ID")

    kwargs = data.model_dump(exclude_unset=True)
    if "plan_id" in kwargs and kwargs["plan_id"]:
        kwargs["plan_id"] = uuid.UUID(kwargs["plan_id"])

    try:
        sub = await update_subscriber(sid, current_user.tenant_id, db, **kwargs)
        return _subscriber_to_dict(sub)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscriber_id}/pause")
async def pause_subscriber_by_id(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Pause a subscriber (user-requested)."""
    try:
        sid = uuid.UUID(subscriber_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscriber ID")

    try:
        sub = await pause_subscriber(sid, current_user.tenant_id, db=db)
        return _subscriber_to_dict(sub)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscriber_id}/suspend")
async def suspend_subscriber_by_id(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Suspend a subscriber (system-enforced for non-payment)."""
    try:
        sid = uuid.UUID(subscriber_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscriber ID")

    try:
        sub = await suspend_subscriber(sid, current_user.tenant_id, db=db)
        return _subscriber_to_dict(sub)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscriber_id}/resume")
async def resume_subscriber_by_id(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Resume a paused or suspended subscriber."""
    try:
        sid = uuid.UUID(subscriber_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscriber ID")

    try:
        sub = await resume_subscriber(sid, current_user.tenant_id, db=db)
        return _subscriber_to_dict(sub)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscriber_id}/activate")
async def activate_subscriber_by_id(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Activate a subscriber on the MikroTik (re-provision)."""
    try:
        sid = uuid.UUID(subscriber_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscriber ID")

    try:
        sub = await activate_subscriber(sid, current_user.tenant_id, db=db)
        return _subscriber_to_dict(sub)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscriber_id}/reconnect")
async def reconnect_subscriber_by_id(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Reconnect a subscriber — removes and re-adds on the router."""
    try:
        sid = uuid.UUID(subscriber_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscriber ID")

    try:
        sub = await reconnect_subscriber_action(sid, current_user.tenant_id, db=db)
        return _subscriber_to_dict(sub)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{subscriber_id}/restart")
async def restart_subscriber_by_id(
    subscriber_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Restart a subscriber's connection on the router."""
    try:
        sid = uuid.UUID(subscriber_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscriber ID")

    try:
        sub = await restart_subscriber_action(sid, current_user.tenant_id, db=db)
        return _subscriber_to_dict(sub)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reconcile")
async def reconcile_subscribers(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Reconcile DB subscribers with MikroTik router config."""
    result = await reconcile_with_router(current_user.tenant_id, db)
    return result


@router.get("/ipam/available")
async def list_available_ips(
    pool_type: str = "wifi",
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get available IPs for new subscriber assignment."""
    ips = await get_available_ips(current_user.tenant_id, pool_type, db)
    return {"available_ips": ips, "count": len(ips)}
