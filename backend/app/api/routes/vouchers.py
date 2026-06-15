import uuid
import secrets
import string
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from pydantic import BaseModel
from app.core.database import get_db
from app.models.voucher import Voucher
from app.models.package import Package
from app.models.tenant import Tenant
from app.models.session import Session
from app.api.routes.auth import get_current_user
from app.services.session_service import create_session

router = APIRouter(tags=["vouchers"])


class GenerateVoucherRequest(BaseModel):
    package_id: str | None = None
    quantity: int = 1
    prefix: str = ""
    expires_in_days: int = 365
    duration_minutes: int | None = None


class RedeemVoucherRequest(BaseModel):
    code: str
    mac_address: str = ""
    ip_address: str = ""


def generate_code(prefix: str = "", length: int = 8) -> str:
    chars = string.ascii_uppercase + string.digits
    code = ''.join(secrets.choice(chars) for _ in range(length))
    return f"{prefix}{code}"


@router.post("/generate")
async def generate_vouchers(
    payload: GenerateVoucherRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    if payload.quantity < 1 or payload.quantity > 500:
        raise HTTPException(status_code=400, detail="Quantity must be between 1 and 500")

    if not payload.package_id and not payload.duration_minutes:
        raise HTTPException(status_code=400, detail="Provide either package_id or duration_minutes")

    if payload.package_id and payload.duration_minutes:
        raise HTTPException(status_code=400, detail="Provide either package_id (package-linked) or duration_minutes (time-based), not both")

    try:
        package_uuid = None
        if payload.package_id:
        try:
            package_uuid = uuid.UUID(payload.package_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid package_id")
        pkg = await db.execute(select(Package).where(Package.id == package_uuid, Package.tenant_id == tenant_id))
        if not pkg.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Package not found")

    if payload.duration_minutes is not None and (payload.duration_minutes < 1 or payload.duration_minutes > 43200):
        raise HTTPException(status_code=400, detail="Duration must be between 1 and 43200 minutes (30 days)")

    batch_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=payload.expires_in_days)

    unique_codes = set()
    attempts = 0
    while len(unique_codes) < payload.quantity and attempts < payload.quantity * 5:
        code = generate_code(payload.prefix)
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
            package_id=package_uuid,
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
        "voucher_type": "time_based" if payload.duration_minutes else "package_linked",
        "duration_minutes": payload.duration_minutes,
    }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voucher generate error: {type(e).__name__}: {e}")


@router.get("")
async def list_vouchers(
    status: str = None,
    batch_id: str = None,
    search: str = None,
    include_suspended: bool = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = uuid.UUID(str(tenant_id_raw))

    try:
        query = select(Voucher).where(Voucher.tenant_id == tenant_id)

        if status:
            query = query.where(Voucher.status == status)
        if batch_id:
            query = query.where(Voucher.batch_id == batch_id)
        if search:
            query = query.where(Voucher.code.ilike(f"%{search}%"))
        if include_suspended is not None:
            query = query.where(Voucher.is_suspended == include_suspended)

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
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Voucher list error: {type(e).__name__}: {e}")


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

    now = datetime.now(timezone.utc)
    if voucher.is_suspended:
        return {"valid": False, "status": "suspended", "message": "Voucher has been suspended by the ISP"}
    if voucher.status == "used":
        return {"valid": False, "status": "used", "message": "Voucher already used", "used_at": voucher.used_at.isoformat() if voucher.used_at else None}
    if voucher.expires_at and voucher.expires_at < now:
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
async def redeem_voucher_portal(
    payload: RedeemVoucherRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Voucher, Package).join(Package, Voucher.package_id == Package.id, isouter=True)
        .where(Voucher.code == payload.code)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Voucher not found")

    voucher, package = row

    now = datetime.now(timezone.utc)
    if voucher.is_suspended:
        raise HTTPException(status_code=400, detail="Voucher has been suspended")
    if voucher.status == "used":
        raise HTTPException(status_code=400, detail="Voucher already used")
    if voucher.expires_at and voucher.expires_at < now:
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

    session = await create_session(
        tenant_id=voucher.tenant_id,
        mac_address=payload.mac_address or "00:00:00:00:00:00",
        ip_address=payload.ip_address or "0.0.0.0",
        package_id=voucher.package_id or package.id if package else None,
        expires_at=now + duration,
        db=db,
    )

    voucher.status = "used"
    voucher.used_at = now
    voucher.session_id = session.id
    voucher.mac_address = payload.mac_address
    await db.commit()

    return {
        "success": True,
        "session_id": str(session.id),
        "package_name": pkg_name,
        "duration_hours": duration.total_seconds() / 3600,
        "message": f"Voucher redeemed! {duration.total_seconds() / 3600:.1f}h of internet access activated.",
    }
