import uuid
import secrets
import string
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from pydantic import BaseModel
from app.core.database import get_db
from app.models.voucher import Voucher
from app.models.package import Package
from app.models.tenant import Tenant
from app.models.session import Session
from app.api.routes.auth import get_current_user
from app.services.session_service import create_session, activate_session, expire_session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.mikrotik_config import MikrotikConfig
from app.services.crypto_service import decrypt
import logging

logger = logging.getLogger("honestbill.vouchers")

router = APIRouter(tags=["vouchers"])
limiter = Limiter(key_func=get_remote_address)


class GenerateVoucherRequest(BaseModel):
    quantity: int = 1
    expires_in_days: int = 365
    duration_minutes: int


class RedeemVoucherRequest(BaseModel):
    code: str
    mac_address: str = ""
    ip_address: str = ""


def generate_code() -> str:
    """Generate a short 5-char voucher code (uppercase + digits)."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(5))


@router.post("/generate")
async def generate_vouchers(
    payload: GenerateVoucherRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        tenant_id_raw = getattr(current_user, "tenant_id", None)
        if not tenant_id_raw:
            raise HTTPException(status_code=400, detail="No tenant on this account")
        tenant_id = uuid.UUID(str(tenant_id_raw))

        if payload.quantity < 1 or payload.quantity > 500:
            raise HTTPException(status_code=400, detail="Quantity must be between 1 and 500")

        if payload.duration_minutes < 1 or payload.duration_minutes > 43200:
            raise HTTPException(status_code=400, detail="Duration must be between 1 and 43200 minutes (30 days)")

        batch_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(days=payload.expires_in_days)

        unique_codes = set()
        attempts = 0
        while len(unique_codes) < payload.quantity and attempts < payload.quantity * 5:
            code = generate_code()
            attempts += 1
            existing = await db.execute(select(Voucher).where(Voucher.tenant_id == tenant_id, Voucher.code == code))
            if not existing.scalar_one_or_none():
                unique_codes.add(code)

        if len(unique_codes) < payload.quantity:
            raise HTTPException(status_code=500, detail=f"Could not generate {payload.quantity} unique codes (generated {len(unique_codes)})")

        vouchers = []
        for code in unique_codes:
            voucher = Voucher(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                code=code,
                batch_id=batch_id,
                status="unused",
                duration_minutes=payload.duration_minutes,
                created_at=now,
                expires_at=expires_at,
            )
            db.add(voucher)
            vouchers.append(voucher)

        await db.commit()

        return {
            "batch_id": batch_id,
            "quantity": len(vouchers),
            "codes": [v.code for v in vouchers],
            "expires_at": expires_at.isoformat(),
            "voucher_type": "time_based",
            "duration_minutes": payload.duration_minutes,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"generate error: {type(e).__name__}: {e}")


@router.get("")
async def list_vouchers(
    status: str = None,
    batch_id: str = None,
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

    query = select(Voucher).where(Voucher.tenant_id == tenant_id)

    if status:
        query = query.where(Voucher.status == status)
    if batch_id:
        query = query.where(Voucher.batch_id == batch_id)
    if search:
        query = query.where(Voucher.code.ilike(f"%{search}%"))

    query = query.order_by(Voucher.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    vouchers = result.scalars().all()

    total = await db.execute(select(func.count(Voucher.id)).where(Voucher.tenant_id == tenant_id))
    total_count = total.scalar()

    counts_result = await db.execute(
        select(Voucher.status, func.count(Voucher.id))
        .where(Voucher.tenant_id == tenant_id)
        .group_by(Voucher.status)
    )
    counts = {row[0]: row[1] for row in counts_result.all()}

    return {
        "total": total_count,
        "counts": {"unused": counts.get("unused", 0), "used": counts.get("used", 0), "expired": counts.get("expired", 0)},
        "vouchers": [
            {
                "id": str(v.id),
                "code": v.code,
                "batch_id": v.batch_id,
                "status": v.status,
                "is_suspended": v.is_suspended,
                "package_id": str(v.package_id) if v.package_id else None,
                "duration_minutes": v.duration_minutes,
                "created_at": v.created_at.isoformat(),
                "expires_at": v.expires_at.isoformat() if v.expires_at else None,
                "used_at": v.used_at.isoformat() if v.used_at else None,
                "mac_address": v.mac_address,
            }
            for v in vouchers
        ],
    }


@router.get("/{code}/status")
async def check_voucher_status(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    result = await db.execute(
        select(Voucher, Package).join(Package, Voucher.package_id == Package.id, isouter=True)
        .where(Voucher.tenant_id == tenant_id, Voucher.code == code)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Voucher not found")

    voucher, package = row

    def _naive(dt):
        return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt

    now = datetime.utcnow()
    if voucher.is_suspended:
        return {"valid": False, "status": "suspended", "message": "Voucher has been suspended by the ISP"}
    if voucher.status == "used":
        return {"valid": False, "status": "used", "message": "Voucher already used", "used_at": voucher.used_at.isoformat() if voucher.used_at else None}
    if voucher.expires_at and _naive(voucher.expires_at) < now:
        return {"valid": False, "status": "expired", "message": "Voucher has expired"}
    if voucher.status == "expired":
        return {"valid": False, "status": "expired", "message": "Voucher has expired"}

    duration_hours = None
    if package:
        duration_hours = package.duration_hours
    elif voucher.duration_minutes:
        duration_hours = voucher.duration_minutes / 60

    return {
        "valid": True,
        "status": "unused",
        "code": voucher.code,
        "package_name": package.name if package else "Time-based access",
        "duration_hours": duration_hours,
        "duration_minutes": voucher.duration_minutes,
    }


@router.delete("/{voucher_id}")
async def void_voucher(
    voucher_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    try:
        v_id = uuid.UUID(voucher_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid voucher ID")

    result = await db.execute(select(Voucher).where(Voucher.id == v_id, Voucher.tenant_id == tenant_id))
    voucher = result.scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    if voucher.status == "used":
        raise HTTPException(status_code=400, detail="Cannot void a used voucher")

    voucher.status = "expired"
    await db.commit()
    return {"message": "Voucher voided", "code": voucher.code}


class BatchVoidRequest(BaseModel):
    voucher_ids: list[str] = []
    batch_id: str | None = None
    void_all: bool = False


@router.post("/batch/void")
async def batch_void_vouchers(
    payload: BatchVoidRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    if not payload.void_all and not payload.voucher_ids and not payload.batch_id:
        raise HTTPException(status_code=400, detail="Provide voucher_ids, batch_id, or set void_all=true")

    query = select(Voucher).where(
        Voucher.tenant_id == tenant_id,
        Voucher.status == "unused",
    )

    if payload.void_all:
        pass  # no additional filter
    elif payload.batch_id:
        query = query.where(Voucher.batch_id == payload.batch_id)
    elif payload.voucher_ids:
        ids = [uuid.UUID(vid) for vid in payload.voucher_ids]
        query = query.where(Voucher.id.in_(ids))

    result = await db.execute(query)
    vouchers = result.scalars().all()

    count = 0
    for v in vouchers:
        v.status = "expired"
        count += 1

    await db.commit()
    return {"message": f"Voided {count} voucher(s)", "count": count}


@router.post("/{voucher_id}/suspend")
async def suspend_voucher(
    voucher_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    try:
        v_id = uuid.UUID(voucher_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid voucher ID")

    result = await db.execute(select(Voucher).where(Voucher.id == v_id, Voucher.tenant_id == tenant_id))
    voucher = result.scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    voucher.is_suspended = True
    await db.commit()
    return {"message": "Voucher suspended", "code": voucher.code}


@router.post("/{voucher_id}/unsuspend")
async def unsuspend_voucher(
    voucher_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    try:
        v_id = uuid.UUID(voucher_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid voucher ID")

    result = await db.execute(select(Voucher).where(Voucher.id == v_id, Voucher.tenant_id == tenant_id))
    voucher = result.scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    voucher.is_suspended = False
    await db.commit()
    return {"message": "Voucher unsuspended", "code": voucher.code}


@router.post("/batch/{batch_id}/suspend")
async def suspend_batch(
    batch_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    result = await db.execute(
        select(Voucher).where(Voucher.tenant_id == tenant_id, Voucher.batch_id == batch_id, Voucher.status == "unused")
    )
    vouchers = result.scalars().all()

    count = 0
    for v in vouchers:
        v.is_suspended = True
        count += 1
    await db.commit()

    return {"message": f"Suspended {count} vouchers in batch", "count": count}


@router.post("/batch/{batch_id}/unsuspend")
async def unsuspend_batch(
    batch_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    result = await db.execute(
        select(Voucher).where(Voucher.tenant_id == tenant_id, Voucher.batch_id == batch_id, Voucher.status == "unused")
    )
    vouchers = result.scalars().all()

    count = 0
    for v in vouchers:
        v.is_suspended = False
        count += 1
    await db.commit()

    return {"message": f"Unsuspended {count} vouchers in batch", "count": count}


@router.post("/redeem")
@limiter.limit("5/minute")
async def redeem_voucher_portal(
    request: Request,
    payload: RedeemVoucherRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(Voucher, Package).join(Package, Voucher.package_id == Package.id, isouter=True)
            .where(Voucher.code == payload.code)
        )
        row = result.one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Voucher not found")

        voucher, package = row

        def _naive(dt):
            return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt

        now = datetime.utcnow()
        if voucher.is_suspended:
            raise HTTPException(status_code=400, detail="Voucher has been suspended")
        if voucher.status == "used":
            raise HTTPException(status_code=400, detail="Voucher already used")
        if voucher.expires_at and _naive(voucher.expires_at) < now:
            raise HTTPException(status_code=400, detail="Voucher has expired")
        if voucher.status == "expired":
            raise HTTPException(status_code=400, detail="Voucher has expired")

        if package and not package.is_active:
            raise HTTPException(status_code=400, detail="Package is no longer active")

        if package:
            duration = timedelta(hours=package.duration_hours)
            pkg_name = package.name
        elif voucher.duration_minutes:
            duration = timedelta(minutes=voucher.duration_minutes)
            pkg_name = f"Time-based ({voucher.duration_minutes} min)"
        else:
            raise HTTPException(status_code=400, detail="Voucher has no duration configured")

        pkg_id = voucher.package_id
        if pkg_id is None and package is not None:
            pkg_id = package.id

        mac = payload.mac_address or "00:00:00:00:00:00"

        # Expire any existing active session for this device so the new voucher works
        if mac != "00:00:00:00:00:00":
            existing_result = await db.execute(
                select(Session).where(
                    Session.mac_address == mac.upper(),
                    Session.tenant_id == voucher.tenant_id,
                    Session.status.in_(["pending_payment", "active"]),
                )
            )
            old_session = existing_result.scalar_one_or_none()
            if old_session:
                try:
                    from app.services.mikrotik_service import remove_mikrotik_user
                    if old_session.reconnect_code:
                        await remove_mikrotik_user(
                            tenant_id=str(voucher.tenant_id),
                            session_id=str(old_session.id),
                            username=old_session.reconnect_code,
                            db=db,
                        )
                except Exception:
                    pass
                await expire_session(session_id=str(old_session.id), db=db)

        session = await create_session(
            tenant_id=voucher.tenant_id,
            mac_address=mac,
            ip_address=payload.ip_address or "0.0.0.0",
            package_id=pkg_id,
            expires_at=now + duration,
            db=db,
        )

        session = await activate_session(session_id=str(session.id), db=db)

        voucher.status = "used"
        voucher.used_at = now
        voucher.session_id = session.id
        voucher.mac_address = payload.mac_address
        session.status = "active"
        await db.commit()

        # Provision on MikroTik (non-blocking — don't fail redemption if router unreachable)
        from app.services.mikrotik_service import create_mikrotik_user
        try:
            mikrotik_result = await create_mikrotik_user(
                tenant_id=str(voucher.tenant_id),
                session_id=str(session.id),
                mac_address=payload.mac_address or "00:00:00:00:00:00",
                ip_address=payload.ip_address or "0.0.0.0",
                username=session.reconnect_code,
                password=session.reconnect_code,
                expires_at=session.expires_at,
                db=db,
            )
        except Exception as e:
            logger.error(f"MikroTik provisioning error for voucher redemption: {e}")
            mikrotik_result = {"success": False, "message": str(e)}

        return {
            "success": True,
            "session_id": str(session.id),
            "package_name": pkg_name,
            "duration_hours": duration.total_seconds() / 3600,
            "mikrotik": mikrotik_result.get("success", False),
            "message": f"Voucher redeemed! {duration.total_seconds() / 3600:.1f}h of internet access activated.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Redeem error: {type(e).__name__}: {e}")
