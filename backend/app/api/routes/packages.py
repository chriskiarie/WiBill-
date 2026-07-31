from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.package import Package

router = APIRouter()


def auto_label(h: int) -> str:
    if h < 24:
        return f"{h} hr{'s' if h != 1 else ''}"
    days = h // 24
    if h % 24 == 0:
        return f"{days} day{'s' if days != 1 else ''}"
    return f"{h} hrs"


class PackageCreate(BaseModel):
    name: str
    price_ksh: float
    duration_hours: int
    duration_label: str
    max_devices: int = 1
    display_order: int = 0


class PackageUpdate(BaseModel):
    name: str | None = None
    price_ksh: float | None = None
    duration_hours: int | None = None
    duration_label: str | None = None
    max_devices: int | None = None
    is_active: bool | None = None
    display_order: int | None = None


@router.get("")
async def list_packages(
    tenant_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — portal uses this to list packages for a tenant.
    Dashboard also uses this, passing tenant_id as query param."""
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id required")
    result = await db.execute(
        select(Package)
        .where(Package.tenant_id == uuid.UUID(tenant_id), Package.is_active == True)
        .order_by(Package.display_order)
    )
    packages = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "price_ksh": float(p.price_ksh),
            "duration_hours": p.duration_hours,
            "duration_label": p.duration_label,
            "max_devices": p.max_devices,
        }
        for p in packages
    ]


@router.get("/mine")
async def list_mine(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Authenticated endpoint — returns all packages for the logged-in ISP admin's tenant."""
    if not current_user.tenant_id:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    result = await db.execute(
        select(Package)
        .where(Package.tenant_id == current_user.tenant_id)
        .order_by(Package.display_order)
    )
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "price_ksh": float(p.price_ksh),
            "duration_hours": p.duration_hours,
            "duration_label": p.duration_label,
            "max_devices": p.max_devices,
            "display_order": p.display_order,
            "is_active": p.is_active,
        }
        for p in result.scalars().all()
    ]


@router.post("")
async def create_package(
    data: PackageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    pkg = Package(
        tenant_id=current_user.tenant_id,
        name=data.name,
        price_ksh=data.price_ksh,
        duration_hours=data.duration_hours,
        duration_label=data.duration_label or auto_label(data.duration_hours),
        max_devices=data.max_devices,
        display_order=data.display_order,
        is_active=True,
    )
    db.add(pkg)
    await db.commit()
    await db.refresh(pkg)
    return {"id": str(pkg.id), "name": pkg.name, "price_ksh": float(pkg.price_ksh)}


@router.patch("/{package_id}")
async def update_package(
    package_id: str,
    data: PackageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    result = await db.execute(
        select(Package).where(
            Package.id == uuid.UUID(package_id),
            Package.tenant_id == current_user.tenant_id,
        )
    )
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    updates = data.model_dump(exclude_unset=True)
    if "duration_hours" in updates and "duration_label" not in updates:
        updates["duration_label"] = auto_label(updates["duration_hours"])
    for field, value in updates.items():
        setattr(pkg, field, value)
    await db.commit()
    return {"message": "Package updated"}


class BulkStatusUpdate(BaseModel):
    package_ids: list[str]
    is_active: bool


@router.post("/bulk-status")
async def bulk_update_status(
    data: BulkStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    if not data.package_ids:
        raise HTTPException(status_code=400, detail="No package IDs provided")
    uuids = []
    for pid in data.package_ids:
        try:
            uuids.append(uuid.UUID(pid))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid package ID: {pid}")
    result = await db.execute(
        select(Package).where(Package.id.in_(uuids), Package.tenant_id == current_user.tenant_id)
    )
    pkgs = result.scalars().all()
    for pkg in pkgs:
        pkg.is_active = data.is_active
    await db.commit()
    return {"message": f"{len(pkgs)} packages updated", "updated": len(pkgs)}


@router.delete("/{package_id}")
async def delete_package(
    package_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    try:
        pid = uuid.UUID(package_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid package ID")

    result = await db.execute(
        select(Package).where(Package.id == pid)
    )
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    if current_user.tenant_id and pkg.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Cannot delete another ISP's package")

    await db.delete(pkg)
    await db.commit()
    return {"ok": True, "message": "Package deleted"}