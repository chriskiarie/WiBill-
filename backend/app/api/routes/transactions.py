from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.transaction import Transaction, TransactionStatus
from app.models.session import Session
from app.models.admin_user import AdminUser

router = APIRouter()

@router.get("")
async def get_transactions(
    limit: int = Query(500, le=2000),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    q = (
        select(Transaction, Session.package_id)
        .join(Session, Transaction.session_id == Session.id, isouter=True)
        .where(Transaction.status == TransactionStatus.SUCCESS)
        .order_by(desc(Transaction.created_at))
        .limit(limit)
    )
    if current_user.tenant_id:
        q = q.where(Transaction.tenant_id == current_user.tenant_id)
    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "id": str(t.id),
            "tenant_id": str(t.tenant_id),
            "session_id": str(t.session_id) if t.session_id else None,
            "package_id": str(pkg_id) if pkg_id else None,
            "phone_number": t.phone_number,
            "amount": float(t.amount_ksh),
            "platform_fee": float(t.platform_fee_ksh),
            "isp_earnings": float(t.isp_earnings_ksh),
            "mpesa_receipt": t.mpesa_receipt,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t, pkg_id in rows
    ]

