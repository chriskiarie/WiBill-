from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.ipam_pool import IpamPool

router = APIRouter()


class IpamPoolCreate(BaseModel):
    name: str
    subnet_cidr: str
    gateway: str
    pool_type: str = "wifi"
    start_ip: str
    end_ip: str
    vlan_id: int | None = None
    interface_name: str | None = None


class IpamPoolUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


@router.get("/pools")
async def list_pools(
    pool_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """List IPAM pools for the ISP."""
    query = select(IpamPool).where(IpamPool.tenant_id == current_user.tenant_id)
    if pool_type:
        query = query.where(IpamPool.pool_type == pool_type)
    query = query.order_by(IpamPool.created_at.desc())
    result = await db.execute(query)
    pools = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "subnet_cidr": p.subnet_cidr,
            "gateway": p.gateway,
            "pool_type": p.pool_type,
            "start_ip": p.start_ip,
            "end_ip": p.end_ip,
            "vlan_id": p.vlan_id,
            "interface_name": p.interface_name,
            "is_active": p.is_active,
        }
        for p in pools
    ]


@router.post("/pools")
async def create_pool(
    data: IpamPoolCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Create a new IPAM pool."""
    pool = IpamPool(
        id=uuid.uuid4(),
        tenant_id=current_user.tenant_id,
        name=data.name,
        subnet_cidr=data.subnet_cidr,
        gateway=data.gateway,
        pool_type=data.pool_type,
        start_ip=data.start_ip,
        end_ip=data.end_ip,
        vlan_id=data.vlan_id,
        interface_name=data.interface_name,
    )
    db.add(pool)
    await db.commit()
    await db.refresh(pool)
    return {"id": str(pool.id), "name": pool.name, "pool_type": pool.pool_type}


@router.patch("/pools/{pool_id}")
async def update_pool(
    pool_id: str,
    data: IpamPoolUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Update an IPAM pool."""
    result = await db.execute(
        select(IpamPool).where(
            IpamPool.id == uuid.UUID(pool_id),
            IpamPool.tenant_id == current_user.tenant_id,
        )
    )
    pool = result.scalar_one_or_none()
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pool, field, value)
    await db.commit()
    return {"message": "Pool updated"}


@router.delete("/pools/{pool_id}")
async def delete_pool(
    pool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Delete an IPAM pool."""
    result = await db.execute(
        select(IpamPool).where(
            IpamPool.id == uuid.UUID(pool_id),
            IpamPool.tenant_id == current_user.tenant_id,
        )
    )
    pool = result.scalar_one_or_none()
    if not pool:
        raise HTTPException(status_code=404, detail="Pool not found")
    await db.delete(pool)
    await db.commit()
    return {"ok": True, "message": "Pool deleted"}
