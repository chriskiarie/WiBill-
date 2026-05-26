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
    is_active: bool | None = None
    display_order: int | None = None
 
 
@router.get("/")
async def list_packages(
    tenant_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — portal uses this to list packages for a tenant."""
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
 
 
@router.post("/")
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
        duration_label=data.duration_label,
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

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pkg, field, value)

    await db.commit()
    return {"message": "Package updated"}


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