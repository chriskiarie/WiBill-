"""
app/api/routes/vouchers.py
Voucher management — generate, list, revoke WiFi voucher codes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.voucher import Voucher
from app.models.package import Package

router = APIRouter()


# ─── schemas ─────────────────────────────────────────────────────────────────

class VoucherGenerate(BaseModel):
    quantity:       int           = Field(ge=1, le=500, description="Number of vouchers to generate")
    duration_hours: int           = Field(ge=1, description="Internet duration each voucher grants")
    price_ksh:      float         = Field(ge=0, description="Face value in KSH")
    package_id:     Optional[str] = None
    note:           Optional[str] = None
    expires_at:     Optional[str] = None   # ISO date string, optional


class VoucherRevoke(BaseModel):
    voucher_ids: list[str]


# ─── helpers ─────────────────────────────────────────────────────────────────

def _serialize(v: Voucher) -> dict:
    return {
        "id":                str(v.id),
        "code":              v.code,
        "note":              v.note,
        "batch_id":          v.batch_id,
        "duration_hours":    v.duration_hours,
        "price_ksh":         float(v.price_ksh),
        "is_used":           v.is_used,
        "is_active":         v.is_active,
        "redeemed_by_mac":   v.redeemed_by_mac,
        "redeemed_by_phone": v.redeemed_by_phone,
        "redeemed_at":       v.redeemed_at.isoformat() if v.redeemed_at else None,
        "expires_at":        v.expires_at.isoformat()  if v.expires_at  else None,
        "created_at":        v.created_at.isoformat()  if v.created_at  else None,
        "package_id":        str(v.package_id) if v.package_id else None,
    }


# ─── routes ──────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_vouchers(
    data: VoucherGenerate,
    db:   AsyncSession = Depends(get_db),
    user: AdminUser    = Depends(require_isp_admin),
):
    """Bulk-generate voucher codes for this ISP."""
    if data.package_id:
        pkg_result = await db.execute(
            select(Package).where(
                Package.id == uuid.UUID(data.package_id),
                Package.tenant_id == user.tenant_id,
            )
        )
        if not pkg_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Package not found")

    expires = None
    if data.expires_at:
        try:
            expires = datetime.fromisoformat(data.expires_at).replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expires_at format, use ISO 8601")

    batch_id = str(uuid.uuid4())
    vouchers = []
    for _ in range(data.quantity):
        v = Voucher(
            id             = uuid.uuid4(),
            tenant_id      = user.tenant_id,
            package_id     = uuid.UUID(data.package_id) if data.package_id else None,
            duration_hours = data.duration_hours,
            price_ksh      = data.price_ksh,
            note           = data.note,
            batch_id       = batch_id,
            expires_at     = expires,
            created_at     = datetime.now(timezone.utc),
        )
        db.add(v)
        vouchers.append(v)

    await db.commit()
    for v in vouchers:
        await db.refresh(v)

    return {
        "batch_id":  batch_id,
        "generated": len(vouchers),
        "vouchers":  [_serialize(v) for v in vouchers],
    }


@router.get("")
async def list_vouchers(
    filter:  str = Query("all",  description="all | available | used | expired"),
    skip:    int = Query(0, ge=0),
    limit:   int = Query(50, ge=1, le=500),
    batch_id:str | None = Query(None),
    db:      AsyncSession = Depends(get_db),
    user:    AdminUser    = Depends(require_isp_admin),
):
    """List this ISP's vouchers with optional filter."""
    q = select(Voucher).where(Voucher.tenant_id == user.tenant_id)

    now = datetime.now(timezone.utc)
    if filter == "available":
        q = q.where(Voucher.is_used == False, Voucher.is_active == True)
    elif filter == "used":
        q = q.where(Voucher.is_used == True)
    elif filter == "expired":
        q = q.where(Voucher.expires_at < now, Voucher.is_used == False)

    if batch_id:
        q = q.where(Voucher.batch_id == batch_id)

    # counts for stats
    total_q = select(func.count()).select_from(
        q.subquery()
    )
    total = (await db.execute(total_q)).scalar() or 0

    q = q.order_by(Voucher.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    vouchers = result.scalars().all()

    # summary stats (always for this tenant)
    stats_result = await db.execute(
        select(
            func.count(Voucher.id).label("total"),
            func.count(Voucher.id).filter(Voucher.is_used == False, Voucher.is_active == True).label("available"),
            func.count(Voucher.id).filter(Voucher.is_used == True).label("used"),
        ).where(Voucher.tenant_id == user.tenant_id)
    )
    stats = stats_result.one()

    return {
        "total":     total,
        "stats": {
            "total":     stats.total,
            "available": stats.available,
            "used":      stats.used,
        },
        "vouchers": [_serialize(v) for v in vouchers],
    }


@router.get("/{voucher_id}")
async def get_voucher(
    voucher_id: str,
    db:  AsyncSession = Depends(get_db),
    user: AdminUser   = Depends(require_isp_admin),
):
    result = await db.execute(
        select(Voucher).where(
            Voucher.id == uuid.UUID(voucher_id),
            Voucher.tenant_id == user.tenant_id,
        )
    )
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Voucher not found")
    return _serialize(v)


@router.delete("/{voucher_id}")
async def revoke_voucher(
    voucher_id: str,
    db:   AsyncSession = Depends(get_db),
    user: AdminUser    = Depends(require_isp_admin),
):
    """Revoke (deactivate) an unused voucher."""
    result = await db.execute(
        select(Voucher).where(
            Voucher.id == uuid.UUID(voucher_id),
            Voucher.tenant_id == user.tenant_id,
        )
    )
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Voucher not found")
    if v.is_used:
        raise HTTPException(status_code=400, detail="Cannot revoke an already-used voucher")
    v.is_active = False
    await db.commit()
    return {"ok": True, "code": v.code}


@router.post("/redeem")
async def redeem_voucher(
    code:      str = Query(...),
    mac:       str = Query(...),
    db:  AsyncSession = Depends(get_db),
):
    """
    Public endpoint — called by the captive portal when customer enters a code.
    Returns the voucher details so the portal can create a session.
    """
    result = await db.execute(
        select(Voucher).where(Voucher.code == code.upper().strip())
    )
    v = result.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Invalid voucher code")
    if v.is_used:
        raise HTTPException(status_code=400, detail="Voucher already used")
    if not v.is_active:
        raise HTTPException(status_code=400, detail="Voucher has been revoked")
    if v.expires_at and v.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Voucher has expired")

    # Mark as used
    v.is_used           = True
    v.redeemed_by_mac   = mac
    v.redeemed_at       = datetime.now(timezone.utc)
    await db.commit()

    return {
        "ok":            True,
        "voucher_id":    str(v.id),
        "duration_hours":v.duration_hours,
        "package_id":    str(v.package_id) if v.package_id else None,
        "tenant_id":     str(v.tenant_id),
    }