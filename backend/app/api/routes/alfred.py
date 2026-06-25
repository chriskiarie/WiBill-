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
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: dict = {}
    page: str = "/admin"
    model: str = "meta-llama/llama-3.2-3b-instruct:free"
    max_tokens: int = 400


PAGE_CONTEXTS = {
    "/admin": "User is on the Dashboard — overview. Lead with revenue and session health.",
    "/admin/isps": "User is on ISP Network. Focus on pending approvals, active vs suspended, recent signups.",
    "/admin/billing": "User is on Billing. Focus on per-ISP revenue, commission, outstanding invoices.",
    "/admin/feature-flags": "User is on Feature Flags. Help identify which ISPs should be upgraded.",
    "/admin/invoices": "User is on Invoices. Surface overdue accounts, days late, payment patterns.",
    "/admin/transactions": "User is on Transactions. Highlight failed txn, success rate, unusual patterns.",
    "/admin/audit-log": "User is on Audit Log. Summarize recent admin actions, flag anything unusual.",
    "/admin/system": "User is on Settings. Note M-Pesa sandbox status, system health, misconfigurations.",
    "/admin/comms": "User is on Comms. Focus on notification delivery, broadcast history.",
}


@router.post("/admin/alfred/chat")
async def alfred_chat(
    req: ChatRequest,
    _: AdminUser = Depends(require_platform_admin),
):
    api_key = settings.OPENROUTER_API_KEY or settings.ANTHROPIC_API_KEY or ""
    if not api_key:
        raise HTTPException(status_code=503, detail="Alfred is not configured — set OPENROUTER_API_KEY in .env")

    ctx = req.context
    plat = ctx.get("platform", {})
    isps = plat.get("isps", {})
    rev = plat.get("revenue", {})
    sess = plat.get("sessions", {})
    overdue_names = ", ".join(o["name"] for o in isps.get("overdue", [])) or "none"

    page_note = PAGE_CONTEXTS.get(req.page, "User is navigating the Batcave.")

    system = f"""You are Alfred — the AI operations officer for WiBill, a Kenyan ISP billing platform.
Tone: calm, precise, direct. Like a chief of staff who reads every log.
Never say "I'm just an AI". Never apologize. Surface what matters, flag what's wrong.
Maximum 3 sentences unless a full briefing is explicitly requested.
Current page: {page_note}

LIVE PLATFORM DATA ({ctx.get('timestamp', 'now')}):
- ISPs: {isps.get('total', 0)} total, {isps.get('active', 0)} active, {isps.get('pending', 0)} pending
- Overdue: {overdue_names}
- Revenue today: KES {rev.get('today_ksh', 0)}, this month: KES {rev.get('month_ksh', 0)}
- Active sessions: {sess.get('active_now', 0)}"""

    body = {
        "model": req.model,
        "max_tokens": req.max_tokens,
        "messages": [
            {"role": "system", "content": system},
            *[{"role": m.role, "content": m.content} for m in req.messages],
        ],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://honestbill.co.ke",
                "X-Title": "WiBill Alfred",
            },
            json=body,
        )
        if resp.status_code != 200:
            detail = resp.text[:200]
            raise HTTPException(status_code=502, detail=f"OpenRouter error: {resp.status_code} — {detail}")
        data = resp.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return {"reply": content or "No response."}


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
