"""
PHASE 1B IMPLEMENTATION: Complete CRUD Read Surface

File: backend/app/api/routes/crud_reads.py

This file adds the missing GET endpoints for:
1. Single resource reads (packages, sessions, transactions, tenants)
2. Dashboard summary endpoints (platform + ISP views)
3. System status visibility (scheduler jobs)

All endpoints respect existing auth model:
- require_platform_admin: Only platform admins
- require_isp_admin: Only ISP admins (see own data)
- get_current_user: Any authenticated user
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid

from app.core.database import get_db
from app.api.routes.auth import require_platform_admin, require_isp_admin, get_current_user
from app.models import (
    AdminUser, Tenant, Package, Session, Transaction,
    SessionStatus, TransactionStatus
)

router = APIRouter(tags=["crud-reads"])


# ============================================================================
# TENANTS - Single Resource Read
# ============================================================================

@router.get("/tenants/{tenant_id}", name="get_tenant_details")
async def get_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Get single tenant details.
    
    Permissions:
    - Platform admin: can view any tenant
    - ISP admin: can only view their own tenant
    """
    try:
        tid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant ID format")
    
    # Check permission
    if current_user.tenant_id is not None and current_user.tenant_id != tid:
        raise HTTPException(status_code=403, detail="Can only view your own tenant")
    
    result = await db.execute(select(Tenant).where(Tenant.id == tid))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return {
        "id": str(tenant.id),
        "slug": tenant.slug,
        "name": tenant.name,
        "is_active": tenant.is_active,
        "support_phone": getattr(tenant, "support_phone", None),
        "commission_rate": float(getattr(tenant, "commission_rate", 0.10)),
        "balance_ksh": float(getattr(tenant, "balance_ksh", 0)),
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        "primary_color": getattr(tenant, "primary_color", "#00E676"),
    }


# ============================================================================
# PACKAGES - Single Resource Read
# ============================================================================

@router.get("/packages/{package_id}", name="get_package_details")
async def get_package(
    package_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Get single package details.
    
    Permissions:
    - Platform admin: can view any package
    - ISP admin: can only view their own packages
    """
    try:
        pid = uuid.UUID(package_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid package ID format")
    
    result = await db.execute(select(Package).where(Package.id == pid))
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Check permission
    if current_user.tenant_id is not None and package.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Can only view your own packages")
    
    return {
        "id": str(package.id),
        "tenant_id": str(package.tenant_id),
        "name": package.name,
        "price_ksh": float(package.price_ksh),
        "duration_hours": package.duration_hours,
        "duration_label": package.duration_label,
        "max_devices": package.max_devices,
        "display_order": getattr(package, "display_order", 0),
        "is_active": package.is_active,
        "created_at": package.created_at.isoformat() if package.created_at else None,
    }


# ============================================================================
# SESSIONS - Single Resource Read (Full Record)
# ============================================================================

@router.get("/sessions/{session_id}", name="get_session_full")
async def get_session_full(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Get full session record (not just status polling).
    
    Permissions:
    - Platform admin: can view any session
    - ISP admin: can only view their own sessions
    """
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    result = await db.execute(select(Session).where(Session.id == sid))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permission
    if current_user.tenant_id is not None and session.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Can only view your own sessions")
    
    return {
        "id": str(session.id),
        "tenant_id": str(session.tenant_id),
        "mac_address": session.mac_address,
        "phone_number": getattr(session, "phone_number", None),
        "ip_address": getattr(session, "ip_address", None),
        "status": session.status.value if hasattr(session.status, 'value') else session.status,
        "started_at": session.started_at.isoformat() if getattr(session, "started_at", None) else None,
        "expires_at": session.expires_at.isoformat() if getattr(session, "expires_at", None) else None,
        "reconnect_code": getattr(session, "reconnect_code", None),
        "last_seen_at": getattr(session, "last_seen_at", None).isoformat() if getattr(session, "last_seen_at", None) else None,
    }


# ============================================================================
# TRANSACTIONS - Single Resource Read
# ============================================================================

@router.get("/transactions/{transaction_id}", name="get_transaction_details")
async def get_transaction(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Get single transaction details.
    
    Permissions:
    - Platform admin: can view any transaction
    - ISP admin: can only view their own transactions
    """
    try:
        tid = uuid.UUID(transaction_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid transaction ID format")
    
    result = await db.execute(select(Transaction).where(Transaction.id == tid))
    transaction = result.scalar_one_or_none()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check permission
    if current_user.tenant_id is not None and transaction.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Can only view your own transactions")
    
    return {
        "id": str(transaction.id),
        "tenant_id": str(transaction.tenant_id),
        "session_id": str(transaction.session_id) if getattr(transaction, "session_id", None) else None,
        "phone_number": getattr(transaction, "phone_number", None),
        "amount_ksh": float(transaction.amount_ksh),
        "platform_fee_ksh": float(transaction.platform_fee_ksh),
        "isp_earnings_ksh": float(transaction.isp_earnings_ksh),
        "mpesa_receipt": getattr(transaction, "mpesa_receipt", None),
        "status": transaction.status.value if hasattr(transaction.status, 'value') else transaction.status,
        "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
    }


# ============================================================================
# DASHBOARD SUMMARY ENDPOINTS
# ============================================================================

@router.get("/dashboard/summary", name="get_dashboard_summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Get dashboard summary metrics.
    
    For Platform Admin: Platform-wide metrics
    For ISP Admin: Their own metrics only
    """
    
    if current_user.tenant_id is None:
        # Platform Admin View
        
        # Count tenants
        tenant_count = await db.execute(select(func.count(Tenant.id)))
        total_tenants = tenant_count.scalar() or 0
        
        # Count packages
        package_count = await db.execute(select(func.count(Package.id)))
        total_packages = package_count.scalar() or 0
        
        # Revenue stats (successful transactions only)
        revenue_result = await db.execute(
            select(
                func.sum(Transaction.amount_ksh),
                func.sum(Transaction.platform_fee_ksh),
                func.sum(Transaction.isp_earnings_ksh),
                func.count(Transaction.id)
            ).where(Transaction.status == TransactionStatus.SUCCESS)
        )
        rev_data = revenue_result.one()
        total_revenue = float(rev_data[0] or 0)
        platform_earnings = float(rev_data[1] or 0)
        isp_earnings_total = float(rev_data[2] or 0)
        transaction_count = rev_data[3] or 0
        
        # Active sessions
        active_sessions = await db.execute(
            select(func.count(Session.id)).where(Session.status == SessionStatus.ACTIVE)
        )
        active_count = active_sessions.scalar() or 0
        
        return {
            "type": "platform",
            "metrics": {
                "total_tenants": total_tenants,
                "total_packages": total_packages,
                "total_transactions": transaction_count,
                "total_revenue_ksh": total_revenue,
                "platform_earnings_ksh": platform_earnings,
                "isp_earnings_total_ksh": isp_earnings_total,
                "active_sessions": active_count,
            }
        }
    
    else:
        # ISP Admin View (their own data only)
        tenant_id = current_user.tenant_id
        
        # Count their packages
        package_count = await db.execute(
            select(func.count(Package.id)).where(Package.tenant_id == tenant_id)
        )
        total_packages = package_count.scalar() or 0
        
        # Revenue stats (their transactions only)
        revenue_result = await db.execute(
            select(
                func.sum(Transaction.amount_ksh),
                func.sum(Transaction.platform_fee_ksh),
                func.sum(Transaction.isp_earnings_ksh),
                func.count(Transaction.id)
            ).where(
                Transaction.tenant_id == tenant_id,
                Transaction.status == TransactionStatus.SUCCESS
            )
        )
        rev_data = revenue_result.one()
        total_revenue = float(rev_data[0] or 0)
        platform_fees_paid = float(rev_data[1] or 0)
        isp_earnings = float(rev_data[2] or 0)
        transaction_count = rev_data[3] or 0
        
        # Their active sessions
        active_sessions = await db.execute(
            select(func.count(Session.id)).where(
                Session.tenant_id == tenant_id,
                Session.status == SessionStatus.ACTIVE
            )
        )
        active_count = active_sessions.scalar() or 0
        
        return {
            "type": "isp",
            "metrics": {
                "total_packages": total_packages,
                "total_transactions": transaction_count,
                "total_revenue_ksh": total_revenue,
                "platform_fees_paid_ksh": platform_fees_paid,
                "isp_earnings_ksh": isp_earnings,
                "active_sessions": active_count,
            }
        }


# ============================================================================
# SYSTEM STATUS ENDPOINTS
# ============================================================================

@router.get("/system/jobs", name="get_scheduler_status")
async def get_scheduler_jobs(
    current_user: AdminUser = Depends(require_platform_admin),
):
    """
    Get APScheduler job status.
    
    Platform admin only.
    Returns:
    - scheduler_running: true/false
    - jobs: list of job details
    """
    try:
        # Import here to avoid issues if scheduler not initialized
        from app.main import scheduler
        
        if not scheduler or not scheduler.running:
            return {
                "scheduler_running": False,
                "jobs": [],
                "message": "Scheduler not running"
            }
        
        jobs = []
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger),
            })
        
        return {
            "scheduler_running": True,
            "jobs": jobs,
            "total_jobs": len(jobs)
        }
    
    except Exception as e:
        return {
            "scheduler_running": False,
            "jobs": [],
            "error": str(e)
        }


# ============================================================================
# ANALYTICS ENDPOINTS (Optional but useful)
# ============================================================================

@router.get("/analytics/revenue-trend", name="get_revenue_trend")
async def get_revenue_trend(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Get daily revenue trend for the last N days.
    
    For Platform Admin: platform-wide trend
    For ISP Admin: their own trend
    """
    from datetime import datetime, timedelta
    from sqlalchemy import and_
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = select(
        func.date(Transaction.created_at).label("date"),
        func.count(Transaction.id).label("count"),
        func.sum(Transaction.amount_ksh).label("total_revenue"),
        func.sum(Transaction.platform_fee_ksh).label("platform_fees"),
        func.sum(Transaction.isp_earnings_ksh).label("isp_earnings"),
    ).where(
        Transaction.created_at >= start_date,
        Transaction.status == TransactionStatus.SUCCESS
    )
    
    # Filter to tenant if ISP
    if current_user.tenant_id is not None:
        query = query.where(Transaction.tenant_id == current_user.tenant_id)
    
    query = query.group_by(func.date(Transaction.created_at)).order_by("date")
    
    result = await db.execute(query)
    rows = result.all()
    
    return {
        "days": days,
        "trend": [
            {
                "date": row.date.isoformat() if row.date else None,
                "transaction_count": row.count or 0,
                "total_revenue_ksh": float(row.total_revenue or 0),
                "platform_fees_ksh": float(row.platform_fees or 0),
                "isp_earnings_ksh": float(row.isp_earnings or 0),
            }
            for row in rows
        ]
    }


@router.get("/analytics/top-packages", name="get_top_packages")
async def get_top_packages(
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Get top-selling packages by transaction count.
    
    For Platform Admin: all packages
    For ISP Admin: their packages only
    """
    from sqlalchemy import and_
    
    query = select(
        Package.id,
        Package.name,
        Package.price_ksh,
        func.count(Transaction.id).label("sold_count"),
        func.sum(Transaction.amount_ksh).label("total_revenue"),
    ).join(
        Transaction,
        Package.id == Transaction.session_id,  # May need adjustment based on actual schema
        isouter=True
    ).where(
        Transaction.status == TransactionStatus.SUCCESS
    )
    
    # Filter to tenant if ISP
    if current_user.tenant_id is not None:
        query = query.where(Package.tenant_id == current_user.tenant_id)
    
    query = (
        query
        .group_by(Package.id, Package.name, Package.price_ksh)
        .order_by(func.count(Transaction.id).desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return {
        "limit": limit,
        "packages": [
            {
                "package_id": str(row.id),
                "name": row.name,
                "price_ksh": float(row.price_ksh),
                "sold_count": row.sold_count or 0,
                "total_revenue_ksh": float(row.total_revenue or 0),
            }
            for row in rows
        ]
    }