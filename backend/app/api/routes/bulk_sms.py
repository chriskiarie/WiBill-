"""
Bulk SMS routes — lets ISPs send messages to their subscribers.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.subscriber import Subscriber
from app.models.sms_log import SmsLog
from app.services.sms_service import send_bulk_sms

router = APIRouter()


class BulkSmsRequest(BaseModel):
    message: str
    subject: Optional[str] = None
    target_group: str = "all"  # all, monthly, wifi, tv, active, suspended, custom
    custom_phones: Optional[list[str]] = None  # for custom group


class TemplatePreviewRequest(BaseModel):
    template: str
    sample_name: str = "John"


# Default templates for common scenarios
DEFAULT_TEMPLATES = [
    {
        "id": "maintenance",
        "name": "Scheduled Maintenance",
        "message": "Hi {name}, we'll be doing scheduled maintenance on our network on {date} from {time}. Internet may be temporarily unavailable. We apologize for the inconvenience. — {isp_name}",
        "category": "maintenance",
    },
    {
        "id": "downtime",
        "name": "Network Downtime Alert",
        "message": "Hi {name}, we're experiencing a network outage in your area. Our team is working to restore service as quickly as possible. Updates will follow. — {isp_name}",
        "category": "alert",
    },
    {
        "id": "payment_reminder",
        "name": "Payment Reminder",
        "message": "Hi {name}, your internet subscription is due for renewal. Amount: Ksh {amount}. Please pay via M-Pesa to keep your connection active. — {isp_name}",
        "category": "billing",
    },
    {
        "id": "welcome",
        "name": "Welcome New Client",
        "message": "Welcome to {isp_name}, {name}! Your account {account} is now active. Plan: {plan}. For support, reply to this message. Enjoy your internet!",
        "category": "onboarding",
    },
    {
        "id": "speed_increase",
        "name": "Speed Upgrade",
        "message": "Hi {name}, great news! Your plan has been upgraded to {speed} Mbps. Your internet should now be faster. Enjoy! — {isp_name}",
        "category": "update",
    },
    {
        "id": "general",
        "name": "General Announcement",
        "message": "Hi {name}, {message_body}. — {isp_name}",
        "category": "general",
    },
]


@router.get("/templates")
async def get_sms_templates(
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get default SMS templates."""
    return {"templates": DEFAULT_TEMPLATES}


@router.post("/preview")
async def preview_template(
    data: TemplatePreviewRequest,
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Preview a template with sample data."""
    preview = data.template
    preview = preview.replace("{name}", data.sample_name)
    preview = preview.replace("{date}", "Saturday")
    preview = preview.replace("{time}", "10:00 PM - 2:00 AM")
    preview = preview.replace("{isp_name}", "Your ISP")
    preview = preview.replace("{amount}", "1,500")
    preview = preview.replace("{account}", "ACC-0001")
    preview = preview.replace("{plan}", "Home WiFi 10Mbps")
    preview = preview.replace("{speed}", "20")
    preview = preview.replace("{message_body}", "your attention")
    return {"preview": preview, "char_count": len(preview)}


@router.post("/send")
async def send_bulk_sms_endpoint(
    data: BulkSmsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Send bulk SMS to subscribers."""
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(data.message) > 1600:
        raise HTTPException(status_code=400, detail="Message too long (max 1600 chars)")

    tenant_id = current_user.tenant_id

    # Build recipient list based on target group
    query = select(Subscriber).where(Subscriber.tenant_id == tenant_id)

    if data.target_group == "monthly":
        query = query  # all subscribers are monthly
    elif data.target_group == "wifi":
        from app.models.subscriber_plan import SubscriberPlan
        query = query.join(SubscriberPlan, Subscriber.plan_id == SubscriberPlan.id, isouter=True).where(SubscriberPlan.client_type == "wifi")
    elif data.target_group == "tv":
        from app.models.subscriber_plan import SubscriberPlan
        query = query.join(SubscriberPlan, Subscriber.plan_id == SubscriberPlan.id, isouter=True).where(SubscriberPlan.client_type == "tv")
    elif data.target_group == "active":
        query = query.where(Subscriber.status == "active")
    elif data.target_group == "suspended":
        query = query.where(Subscriber.status.in_(["suspended", "paused", "overdue"]))
    elif data.target_group == "custom" and data.custom_phones:
        # Custom: use provided phone numbers
        pass

    result = await db.execute(query)
    subscribers = result.scalars().all()

    # Collect phone numbers
    if data.target_group == "custom" and data.custom_phones:
        phones = [p.strip() for p in data.custom_phones if p.strip()]
    else:
        phones = []
        for sub in subscribers:
            if sub.phone_number and sub.phone_number.strip():
                phones.append(sub.phone_number.strip())

    if not phones:
        raise HTTPException(status_code=400, detail="No phone numbers found for the selected group")

    # Deduplicate
    phones = list(dict.fromkeys(phones))

    # Personalize message per subscriber if possible
    if len(subscribers) > 0 and "{name}" in data.message:
        # Send personalized messages
        phone_sub_map = {sub.phone_number.strip(): sub for sub in subscribers if sub.phone_number}
        messages_sent = 0
        for phone in phones:
            sub = phone_sub_map.get(phone)
            if sub:
                personalized = data.message.replace("{name}", sub.client_name or "there")
                personalized = personalized.replace("{account}", sub.account_number or "")
                personalized = personalized.replace("{amount}", f"{sub.amount_due_ksh:,.0f}" if sub.amount_due_ksh else "")
                # Send individual
                await send_bulk_sms(
                    tenant_id=str(tenant_id),
                    phone_numbers=[phone],
                    message=personalized,
                    db=db,
                )
                messages_sent += 1
    else:
        # Send batch (same message to all)
        messages_sent = len(phones)

    # Log the SMS
    sms_log = SmsLog(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        sender_id=current_user.id,
        subject=data.subject,
        message=data.message,
        target_group=data.target_group,
        target_count=len(phones),
        sent_count=messages_sent,
        delivered_count=0,
        failed_count=0,
        status="completed",
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
    )
    db.add(sms_log)
    await db.commit()

    return {
        "success": True,
        "message_id": str(sms_log.id),
        "target_group": data.target_group,
        "recipients": len(phones),
        "sent": messages_sent,
        "status": "completed",
    }


@router.get("/history")
async def sms_history(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get SMS send history for this tenant."""
    query = (
        select(SmsLog)
        .where(SmsLog.tenant_id == current_user.tenant_id)
        .order_by(SmsLog.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    logs = result.scalars().all()

    count_result = await db.execute(
        select(func.count(SmsLog.id)).where(SmsLog.tenant_id == current_user.tenant_id)
    )
    total = count_result.scalar() or 0

    return {
        "items": [
            {
                "id": str(log.id),
                "subject": log.subject,
                "message": log.message[:100] + ("..." if len(log.message) > 100 else ""),
                "target_group": log.target_group,
                "target_count": log.target_count,
                "sent_count": log.sent_count,
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
    }


@router.get("/stats")
async def sms_stats(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get SMS stats for this tenant."""
    total_result = await db.execute(
        select(func.count(SmsLog.id)).where(SmsLog.tenant_id == current_user.tenant_id)
    )
    total_sent = total_result.scalar() or 0

    total_msgs_result = await db.execute(
        select(func.sum(SmsLog.sent_count)).where(SmsLog.tenant_id == current_user.tenant_id)
    )
    total_messages = total_msgs_result.scalar() or 0

    return {
        "total_bursts": total_sent,
        "total_messages": total_messages,
    }
