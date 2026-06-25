from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from pydantic import BaseModel
import httpx

from app.core.database import get_db
from app.api.routes.auth import require_platform_admin
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.transaction import Transaction
from app.models.session import Session
from app.models.audit_log import AuditLog
from app.core.config import settings

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    system: str = ""
    model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 1000


@router.post("/admin/alfred/chat")
async def alfred_chat(
    req: ChatRequest,
    _: AdminUser = Depends(require_platform_admin),
):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="Alfred is not configured — ANTHROPIC_API_KEY missing")
    body = {
        "model": req.model,
        "max_tokens": req.max_tokens,
        "system": req.system,
        "messages": [{"role": m.role, "content": m.content} for m in req.messages],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=body,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Claude API error: {resp.status_code}")
        data = resp.json()
    content = data.get("content", [])
    return {"response": content[0]["text"] if content else "No response."}


@router.get("/admin/alfred/context")
async def get_alfred_context(
    db: AsyncSession = Depends(get_db),
    _: AdminUser = Depends(require_platform_admin),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    month_start = now.replace(day=1, hour=0, minute=0, second=0)

    # ISP counts
    total_isps = await db.scalar(select(func.count(Tenant.id)))
    active_isps = await db.scalar(
        select(func.count(Tenant.id)).where(Tenant.is_active == True)
    )
    pending_isps = await db.scalar(
        select(func.count(Tenant.id)).where(Tenant.status == "pending_approval")
    )

    # Revenue — status is "success" for completed
    revenue_today = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount_ksh), 0))
        .where(and_(
            Transaction.status == "success",
            Transaction.created_at >= today_start
        ))
    ) or 0

    revenue_yesterday = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount_ksh), 0))
        .where(and_(
            Transaction.status == "success",
            Transaction.created_at >= yesterday_start,
            Transaction.created_at < today_start
        ))
    ) or 0

    revenue_month = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount_ksh), 0))
        .where(and_(
            Transaction.status == "success",
            Transaction.created_at >= month_start
        ))
    ) or 0

    # Active sessions
    active_sessions = await db.scalar(
        select(func.count(Session.id))
        .where(Session.status == "active")
    ) or 0

    # Overdue invoices
    overdue = await db.execute(
        select(Tenant.name, Tenant.invoice_status, Tenant.monthly_fee_ksh)
        .where(Tenant.invoice_status.in_(["overdue", "paused"]))
    )
    overdue_list = [
        {"name": r.name, "status": r.invoice_status, "fee": float(r.monthly_fee_ksh or 0)}
        for r in overdue.fetchall()
    ]

    # Recent transactions
    recent_txns = await db.execute(
        select(Transaction)
        .order_by(Transaction.created_at.desc())
        .limit(5)
    )
    txn_list = [
        {
            "amount": float(t.amount_ksh),
            "status": t.status,
            "phone": t.phone_number[-4:] if t.phone_number else "????",
            "time": t.created_at.strftime("%H:%M") if t.created_at else "",
        }
        for t in recent_txns.scalars()
    ]

    # Recent audit log
    recent_audit = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(8)
    )
    audit_list = [
        {
            "action": a.action,
            "actor": a.actor_email,
            "target": a.target_type or "",
            "time": a.created_at.strftime("%H:%M") if a.created_at else "",
        }
        for a in recent_audit.scalars()
    ]

    return {
        "timestamp": now.isoformat(),
        "platform": {
            "isps": {
                "total": total_isps,
                "active": active_isps,
                "pending": pending_isps,
                "overdue": overdue_list,
            },
            "revenue": {
                "today_ksh": float(revenue_today),
                "yesterday_ksh": float(revenue_yesterday),
                "month_ksh": float(revenue_month),
            },
            "sessions": {
                "active_now": active_sessions,
            },
            "recent_transactions": txn_list,
            "recent_audit": audit_list,
        }
    }
