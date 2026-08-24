"""
SMS service — sends bulk SMS via Africa's Talking API.
Falls back to mock mode when credentials aren't configured.
"""
import httpx
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tenant import Tenant
from app.models.sms_config import SmsConfig
from app.services.crypto_service import decrypt

logger = logging.getLogger("wibill.sms")

# Africa's Talking API endpoints (Sandbox)
AT_SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging"
AT_PRODUCTION_URL = "https://api.africastalking.com/version1/messaging"


async def _get_sms_config(tenant_id: str, db: AsyncSession) -> dict | None:
    """
    Get SMS config for a tenant from the sms_configs table.
    Returns dict with api_key, username, sender_id, environment or None if not configured.
    """
    result = await db.execute(select(SmsConfig).where(SmsConfig.tenant_id == tenant_id))
    config = result.scalar_one_or_none()

    if not config or not config.is_active:
        return None

    return {
        "api_key": decrypt(config.api_key_enc),
        "username": decrypt(config.username_enc),
        "sender_id": config.sender_id,
        "environment": config.environment,
    }


async def send_bulk_sms(
    tenant_id: str,
    phone_numbers: list[str],
    message: str,
    sender_id: str | None = None,
    db: AsyncSession = None,
) -> dict:
    """
    Send SMS to a list of phone numbers via Africa's Talking.
    Returns: {success, sent_count, failed_count, errors, provider_ref}
    """
    config = await _get_sms_config(tenant_id, db)

    if not config:
        # Mock mode — log the SMS but don't actually send
        logger.info(f"[SMS MOCK] Sending to {len(phone_numbers)} numbers: {message[:80]}...")
        return {
            "success": True,
            "mock": True,
            "sent_count": len(phone_numbers),
            "delivered_count": 0,
            "failed_count": 0,
            "errors": [],
            "provider_ref": f"mock-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        }

    # Real Africa's Talking integration
    api_key = config.get("api_key")
    username = config.get("username")
    is_production = config.get("environment") == "production"
    url = AT_PRODUCTION_URL if is_production else AT_SANDBOX_URL

    headers = {
        "apiKey": api_key,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }

    sent = 0
    failed = 0
    errors = []
    batch_id = None

    # Africa's Talking supports up to 100 recipients per request
    batch_size = 100
    for i in range(0, len(phone_numbers), batch_size):
        batch = phone_numbers[i:i + batch_size]
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                # Format recipients
                to_param = ",".join(batch)

                data = {
                    "username": username,
                    "to": to_param,
                    "message": message,
                }
                if sender_id:
                    data["from"] = sender_id

                r = await client.post(url, data=data, headers=headers)

                if r.status_code == 200:
                    resp = r.json()
                    recipients = resp.get("SMSMessageData", {}).get("Recipients", [])
                    batch_id = resp.get("SMSMessageData", {}).get("MessageId", batch_id)

                    for rec in recipients:
                        if rec.get("status") == "Success":
                            sent += 1
                        else:
                            failed += 1
                            errors.append(f"{rec.get('number')}: {rec.get('status')}")
                else:
                    failed += len(batch)
                    errors.append(f"HTTP {r.status_code}: {r.text[:200]}")

        except Exception as e:
            failed += len(batch)
            errors.append(f"Batch error: {str(e)}")
            logger.error(f"SMS batch error: {e}")

    return {
        "success": failed == 0,
        "mock": False,
        "sent_count": sent,
        "delivered_count": sent,  # AT doesn't confirm delivery immediately
        "failed_count": failed,
        "errors": errors[:20],  # cap error list
        "provider_ref": batch_id,
    }
