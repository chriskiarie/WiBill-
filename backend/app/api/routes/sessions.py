"""
app/api/routes/sessions.py - Session management for portal
Handles:
1. Session creation on package selection
2. M-Pesa STK push initiation
3. Payment status polling
4. Session activation after payment
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
from pydantic import BaseModel
from uuid import UUID, uuid4
from decimal import Decimal
import secrets
import re

from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.package import Package
from app.models.session import Session as DBSession
from app.models.transaction import Transaction
from app.services.session_service import create_session, expire_session
from app.services.mpesa_service import initiate_session_payment
from app.api.routes.auth import get_current_user

from app.services.mikrotik_service import create_mikrotik_user, add_hotspot_bypass

router = APIRouter(prefix="/portal", tags=["portal-sessions"])


class CreateSessionRequest(BaseModel):
    """Request to create a session + initiate payment"""
    mac_address: str
    ip_address: str
    package_id: str  # UUID string
    phone_number: str  # M-Pesa phone number (e.g., 254712345678)


class SessionResponse(BaseModel):
    """Session response with payment details"""
    session_id: str
    checkout_request_id: str | None = None
    status: str
    amount_ksh: float
    expires_in_seconds: int
    message: str


@router.post("/{slug}/sessions", response_model=SessionResponse)
async def create_session_with_payment(
    slug: str,
    payload: CreateSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Create session + initiate M-Pesa STK push
    
    Flow:
    1. Validate tenant exists
    2. Validate package exists and is active
    3. Create session in DB (status: pending_payment)
    4. Create transaction (status: pending)
    5. Initiate M-Pesa STK push
    6. Return session ID for polling
    """
    
    # 1. Get tenant
    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"ISP '{slug}' not found")
    
    # 2. Parse and validate package_id as UUID
    try:
        package_uuid = UUID(payload.package_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid package_id format. Expected UUID.")
    
    # Get package
    pkg_result = await db.execute(
        select(Package).where(
            Package.id == package_uuid,
            Package.tenant_id == tenant.id,
            Package.is_active == True
        )
    )
    package = pkg_result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found or inactive")
    
    # 3. Validate phone number format (Kenya: starts with 254 or 07)
    phone = str(payload.phone_number).strip()
    if not _validate_phone_number(phone):
        raise HTTPException(
            status_code=400, 
            detail="Invalid phone number. Use format: 254712345678 or 0712345678"
        )
    
    # Normalize to international format
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    
    try:
        # 4. Normalize MAC/IP — generate placeholders if empty (preview mode, no real hotspot)
        mac = payload.mac_address.strip() if payload.mac_address else ""
        ip = payload.ip_address.strip() if payload.ip_address else ""
        if not mac:
            mac = "00:00:00:00:00:00"
        if not ip:
            ip = "0.0.0.0"

        session = await create_session(
            tenant_id=tenant.id,
            mac_address=mac,
            ip_address=ip,
            package_id=package.id,
            expires_at=datetime.utcnow() + timedelta(hours=package.duration_hours),
            db=db
        )
        
        # 5. Create transaction record (pending status)
        transaction = Transaction(
            id=uuid4(),
            tenant_id=tenant.id,
            session_id=session.id,
            amount_ksh=float(package.price_ksh),
            platform_fee_ksh=float(package.price_ksh) * 0.1,
            isp_earnings_ksh=float(package.price_ksh) * 0.9,
            phone_number=phone,
            status="pending"
        )
        db.add(transaction)
        
        # 6. Initiate STK push via mpesa_service
        mpesa_txn = await initiate_session_payment(
            tenant_id=tenant.id,
            session_id=session.id,
            phone_number=phone,
            amount=Decimal(str(package.price_ksh)),
            db=db
        )
        
        if mpesa_txn.status != "processing":
            detail = mpesa_txn.error_reason or "Failed to initiate M-Pesa payment"
            raise HTTPException(status_code=400, detail=detail)
        
        # 7. Store checkout_request_id and phone on session for callback matching
        session.checkout_request_id = mpesa_txn.checkout_request_id
        session.phone_number = phone
        await db.commit()
        
        return SessionResponse(
            session_id=str(session.id),
            checkout_request_id=mpesa_txn.checkout_request_id,
            status="pending_payment",
            amount_ksh=float(package.price_ksh),
            expires_in_seconds=90,
            message=f"Enter M-Pesa PIN to pay KSH {package.price_ksh} for {package.name}"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{slug}/sessions/{session_id}")
async def get_session_status(
    slug: str,
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Poll session status
    
    Returns different status based on payment:
    - pending_payment: Waiting for M-Pesa response
    - active: Payment received, user has internet
    - expired: Session time expired
    - failed: Payment failed
    """
    
    # Validate session_id is UUID
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")
    
    # Get session
    session_result = await db.execute(
        select(DBSession).where(
            DBSession.id == session_uuid
        )
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify belongs to this tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.slug == slug)
    )
    tenant = tenant_result.scalar_one_or_none()
    if not tenant or session.tenant_id != tenant.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Calculate time remaining
    now = datetime.utcnow()
    
    if session.status == "pending_payment":
        # Still waiting for payment
        return {
            "session_id": str(session.id),
            "status": "pending_payment",
            "message": "Waiting for M-Pesa payment...",
            "remaining_seconds": max(0, int((session.expires_at - now).total_seconds()))
        }
    
    elif session.status == "active":
        # Payment successful, user has internet
        package_result = await db.execute(
            select(Package).where(Package.id == session.package_id)
        )
        package = package_result.scalar_one_or_none()
        
        return {
            "session_id": str(session.id),
            "status": "active",
            "message": f"Connected! Internet available until {session.expires_at.isoformat()}Z",
            "internet_available_until": session.expires_at.isoformat() + "Z",
            "reconnect_code": session.reconnect_code,
            "package_name": package.name if package else "Unknown",
            "phone_number": session.phone_number,
            "amount_ksh": float(package.price_ksh) if package else 0,
            "remaining_minutes": max(0, int((session.expires_at - now).total_seconds() / 60))
        }
    
    elif session.status == "expired":
        return {
            "session_id": str(session.id),
            "status": "expired",
            "message": "Session has expired. Please purchase again.",
            "expired_at": session.expires_at.isoformat() + "Z"
        }
    
    elif session.status == "failed":
        return {
            "session_id": str(session.id),
            "status": "failed",
            "message": "Payment failed. Please try again."
        }
    
    else:
        return {
            "session_id": str(session.id),
            "status": session.status,
            "message": f"Session status: {session.status}"
        }


@router.post("/{slug}/sessions/{session_id}/activate")
async def activate_session(
    slug: str,
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Activate session on MikroTik after payment confirmed
    
    Called by M-Pesa callback handler when payment is received.
    Creates MikroTik user with session details.
    """
    
    # Validate session_id is UUID
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")
    
    # Get session
    session_result = await db.execute(
        select(DBSession).where(
            DBSession.id == session_uuid
        )
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == session.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Verify authorization
    if tenant.slug != slug:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Verify user owns this tenant
    user_tenant_id = getattr(current_user, "tenant_id", None)
    if user_tenant_id and str(user_tenant_id) != str(session.tenant_id):
        raise HTTPException(status_code=403, detail="Unauthorized")

    if session.status == "active":
        return {"message": "Session already active"}
    
    try:
        # Create user on MikroTik
        mk_result = await create_mikrotik_user(
            tenant_id=tenant.id,
            session_id=str(session.id),
            mac_address=session.mac_address,
            ip_address=session.ip_address,
            username=session.reconnect_code,
            password=_generate_temp_password(),
            expires_at=session.expires_at,
            db=db
        )
        
        if not mk_result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=f"Failed to activate on network: {mk_result.get('message')}"
            )
        
        # Queue ip-binding bypass
        if session.mac_address and session.mac_address != "00:00:00:00:00:00":
            try:
                await add_hotspot_bypass(
                    tenant_id=tenant.id,
                    mac_address=session.mac_address,
                    ip_address=session.ip_address or "0.0.0.0",
                    expires_at=session.expires_at,
                    db=db,
                )
            except Exception:
                pass
        
        # Mark session as active
        stmt = update(DBSession).where(
            DBSession.id == session.id
        ).values(status="active", activated_at=datetime.utcnow())
        await db.execute(stmt)
        await db.commit()
        
        return {
            "session_id": str(session.id),
            "status": "active",
            "message": "Connected! Internet is active.",
            "mikrotik_response": mk_result
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def _validate_phone_number(phone: str) -> bool:
    """Validate Kenyan phone number"""
    # Accept: 254712345678 or 0712345678
    pattern = r'^(254|0)7\d{8}$'
    return bool(re.match(pattern, phone))


def _generate_temp_password(length: int = 8) -> str:
    """Generate temporary password for MikroTik user"""
    return secrets.token_urlsafe(length)

# -- ISP Dashboard Sessions ---------------------------------------------------
from app.api.routes.auth import get_current_user

@router.get("")
async def list_isp_sessions(
    status: str = None,
    skip: int = 0,
    limit: int = 50,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List sessions for the current ISP tenant."""
    from app.models.session import Session
    from sqlalchemy import select, desc
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    from uuid import UUID
    tenant_id = UUID(str(tenant_id_raw))
    query = select(Session).where(Session.tenant_id == tenant_id)
    if status:
        query = query.where(Session.status == status)
    query = query.order_by(desc(Session.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    sessions = result.scalars().all()
    from app.models.package import Package
    # Build package lookup map
    pkg_ids = [s.package_id for s in sessions if s.package_id]
    pkg_map = {}
    if pkg_ids:
        pkg_result = await db.execute(
            select(Package).where(Package.id.in_(pkg_ids))
        )
        for pkg in pkg_result.scalars().all():
            pkg_map[str(pkg.id)] = pkg

    def _pkg_name(pid):
        p = pkg_map.get(str(pid))
        return p.name if p else None

    def _pkg_amount(pid):
        p = pkg_map.get(str(pid))
        return float(p.price_ksh) if p else None

    return [
        {
            "id": str(s.id),
            "mac_address": s.mac_address,
            "ip_address": s.ip_address,
            "phone_number": s.phone_number,
            "status": s.status.value if hasattr(s.status, "value") else s.status,
            "created_at": s.created_at.isoformat() + "Z",
            "expires_at": s.expires_at.isoformat() + "Z" if s.expires_at else None,
            "package_id": str(s.package_id) if s.package_id else None,
            "package_name": _pkg_name(s.package_id),
            "amount_ksh": _pkg_amount(s.package_id),
        }
        for s in sessions
    ]
