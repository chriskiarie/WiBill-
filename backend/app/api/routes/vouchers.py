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
    package_id: str
    quantity: int = 1
    prefix: str = ""
    expires_in_days: int = 365


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

    try:
        package_uuid = uuid.UUID(payload.package_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid package_id")

    pkg = await db.execute(select(Package).where(Package.id == package_uuid, Package.tenant_id == tenant_id))
    if not pkg.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Package not found")

    batch_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=payload.expires_in_days)

    unique_codes = set()
    while len(unique_codes) < payload.quantity:
        code = generate_code(payload.prefix)
        existing = await db.execute(select(Voucher).where(Voucher.tenant_id == tenant_id, Voucher.code == code))
        if not existing.scalar_one_or_none():
            unique_codes.add(code)

    vouchers = []
    for code in unique_codes:
        voucher = Voucher(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            package_id=package_uuid,
            code=code,
            batch_id=batch_id,
            status="unused",
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
    }


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
                "package_id": str(v.package_id) if v.package_id else None,
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
        select(Voucher, Package).join(Package, Voucher.package_id == Package.id)
        .where(Voucher.tenant_id == tenant_id, Voucher.code == code)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Voucher not found")

    voucher, package = row

    now = datetime.now(timezone.utc)
    if voucher.status == "used":
        return {"valid": False, "status": "used", "message": "Voucher already used", "used_at": voucher.used_at.isoformat() if voucher.used_at else None}
    if voucher.expires_at and voucher.expires_at < now:
        return {"valid": False, "status": "expired", "message": "Voucher has expired"}
    if voucher.status == "expired":
        return {"valid": False, "status": "expired", "message": "Voucher has expired"}

    return {
        "valid": True,
        "status": "unused",
        "code": voucher.code,
        "package_name": package.name,
        "duration_hours": package.duration_hours,
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


# Public endpoint for portal voucher redemption
@router.post("/redeem")
async def redeem_voucher_portal(
    payload: RedeemVoucherRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Voucher, Package).join(Package, Voucher.package_id == Package.id)
        .where(Voucher.code == payload.code)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Voucher not found")

    voucher, package = row

    now = datetime.now(timezone.utc)
    if voucher.status == "used":
        raise HTTPException(status_code=400, detail="Voucher already used")
    if voucher.expires_at and voucher.expires_at < now:
        raise HTTPException(status_code=400, detail="Voucher has expired")
    if voucher.status == "expired":
        raise HTTPException(status_code=400, detail="Voucher has expired")

    if not package.is_active:
        raise HTTPException(status_code=400, detail="Package is no longer active")

    session = await create_session(
        tenant_id=voucher.tenant_id,
        mac_address=payload.mac_address,
        ip_address=payload.ip_address,
        package_id=package.id,
        expires_at=now + timedelta(hours=package.duration_hours),
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
        "package_name": package.name,
        "duration_hours": package.duration_hours,
        "message": f"Voucher redeemed! {package.duration_hours}h of internet access activated.",
    }
