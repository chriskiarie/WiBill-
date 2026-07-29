import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.lead import Lead
from app.models.notification import Notification
from app.models.smtp_config import SmtpConfig
from app.services.email_service import send_email
from app.services.crypto_service import decrypt

log = logging.getLogger("honestbill.leads")
router = APIRouter()


class LeadCreate(BaseModel):
    isp_name: str
    contact_name: str
    phone: str
    email: EmailStr
    hotspot_count: int | None = None
    how_heard: str | None = None


@router.post("/leads")
async def create_lead(req: LeadCreate, db: AsyncSession = Depends(get_db)):
    lead = Lead(
        id=uuid.uuid4(),
        isp_name=req.isp_name.strip(),
        contact_name=req.contact_name.strip(),
        phone=req.phone.strip(),
        email=req.email.strip().lower(),
        hotspot_count=req.hotspot_count,
        how_heard=req.how_heard.strip() if req.how_heard else None,
    )
    db.add(lead)

    # In-app notification for platform admin (target_tenant_id=NULL = broadcast)
    notification = Notification(
        id=uuid.uuid4(),
        type="lead_submission",
        title=f"New lead: {req.isp_name.strip()}",
        message=(
            f"{req.contact_name.strip()} from {req.isp_name.strip()} "
            f"requested access.\n"
            f"Phone: {req.phone.strip()} | Email: {req.email.strip()}"
            + (f"\nHotspots: ~{req.hotspot_count}" if req.hotspot_count else "")
            + (f"\nHeard about us: {req.how_heard.strip()}" if req.how_heard else "")
        ),
        sender_id=None,
        target_tenant_id=None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notification)

    # Email notification — send to platform admin from email
    stmt = select(SmtpConfig).limit(1)
    result = await db.execute(stmt)
    smtp_config = result.scalar_one_or_none()

    if smtp_config and smtp_config.is_configured and smtp_config.from_email:
        admin_email = smtp_config.from_email
        html_body = f"""
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #E8B84B; margin-bottom: 4px;">WiBill — New Lead</h2>
          <p style="color: #555; font-size: 13px; margin-top: 0;">A new ISP requested access.</p>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #888;">ISP Name</td><td style="padding: 8px 0; font-weight: 600;">{req.isp_name}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Contact</td><td style="padding: 8px 0;">{req.contact_name}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Phone</td><td style="padding: 8px 0;">{req.phone}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0;">{req.email}</td></tr>
            {"<tr><td style='padding: 8px 0; color: #888;'>Hotspots</td><td style='padding: 8px 0;'>~" + str(req.hotspot_count) + "</td></tr>" if req.hotspot_count else ""}
            {"<tr><td style='padding: 8px 0; color: #888;'>Heard about us</td><td style='padding: 8px 0;'>" + req.how_heard + "</td></tr>" if req.how_heard else ""}
          </table>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">This lead has also been saved in your admin dashboard under notifications.</p>
        </div>
        """
        text_body = (
            f"New Lead: {req.isp_name}\n"
            f"Contact: {req.contact_name}\n"
            f"Phone: {req.phone}\n"
            f"Email: {req.email}"
            + (f"\nHotspots: ~{req.hotspot_count}" if req.hotspot_count else "")
            + (f"\nHeard about us: {req.how_heard}" if req.how_heard else "")
        )
        try:
            await send_email(
                to_email=admin_email,
                subject=f"[WiBill] New lead: {req.isp_name.strip()}",
                html_body=html_body,
                text_body=text_body,
                db=db,
            )
        except Exception as e:
            log.warning(f"Lead email notification failed: {e}")

    await db.commit()
    await db.refresh(lead)

    return {"ok": True, "message": "Thanks! We'll be in touch soon."}
