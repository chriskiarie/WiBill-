"""
SMS configuration endpoints — Africa's Talking credentials per ISP.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from pydantic import BaseModel
from datetime import datetime, timezone
import logging
import httpx

from app.core.database import get_db
from app.models.sms_config import SmsConfig, SmsConfigStatus
from app.services.crypto_service import decrypt, encrypt
from app.api.routes.auth import get_current_user

router = APIRouter(tags=["sms-config"])
logger = logging.getLogger(__name__)

AT_SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging"
AT_PRODUCTION_URL = "https://api.africastalking.com/version1/messaging"


class SmsConfigInput(BaseModel):
    api_key: str
    username: str
    sender_id: str = ""
    environment: str = "sandbox"


class SmsConfigResponse(BaseModel):
    id: str
    provider: str
    environment: str
    sender_id: str | None
    status: str
    is_active: bool
    is_verified: bool
    last_test_status: str | None
    last_test_at: str | None
    verified_at: str | None


@router.get("/sms/config")
async def get_sms_config(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get SMS configuration for the ISP."""
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = UUID(str(tenant_id_raw))

    result = await db.execute(select(SmsConfig).where(SmsConfig.tenant_id == tenant_id))
    config = result.scalar_one_or_none()

    if not config:
        return {"configured": False}

    return {
        "configured": True,
        "id": str(config.id),
        "provider": config.provider,
        "environment": config.environment,
        "sender_id": config.sender_id,
        "status": config.status,
        "is_active": config.is_active,
        "is_verified": config.is_verified,
        "last_test_status": config.last_test_status,
        "last_test_at": config.last_test_at.isoformat() if config.last_test_at else None,
        "verified_at": config.verified_at.isoformat() if config.verified_at else None,
    }


@router.post("/sms/config")
async def save_sms_config(
    payload: SmsConfigInput,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save SMS configuration for the ISP."""
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = UUID(str(tenant_id_raw))

    result = await db.execute(select(SmsConfig).where(SmsConfig.tenant_id == tenant_id))
    config = result.scalar_one_or_none()

    if config:
        config.api_key_enc = encrypt(payload.api_key)
        config.username_enc = encrypt(payload.username)
        config.sender_id = payload.sender_id or None
        config.environment = payload.environment
        config.status = SmsConfigStatus.CONFIGURED
        config.is_verified = False
        config.verified_at = None
    else:
        config = SmsConfig(
            tenant_id=tenant_id,
            api_key_enc=encrypt(payload.api_key),
            username_enc=encrypt(payload.username),
            sender_id=payload.sender_id or None,
            environment=payload.environment,
            status=SmsConfigStatus.CONFIGURED,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)

    return {
        "success": True,
        "id": str(config.id),
        "status": config.status,
    }


@router.post("/sms/config/test")
async def test_sms_config(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Test SMS configuration by verifying Africa's Talking credentials."""
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = UUID(str(tenant_id_raw))

    result = await db.execute(select(SmsConfig).where(SmsConfig.tenant_id == tenant_id))
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="No SMS configuration found")

    api_key = decrypt(config.api_key_enc)
    username = decrypt(config.username_enc)
    is_production = config.environment == "production"
    url = AT_PRODUCTION_URL if is_production else AT_SANDBOX_URL

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # Africa's Talking uses a simple GET to check auth
            # We'll try to send a test to ourselves (sandbox only)
            # For sandbox, just verify the API key works by hitting the endpoint
            headers = {
                "apiKey": api_key,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            }

            # Use the SMS endpoint to verify credentials
            # In sandbox, sending to the username itself works for verification
            data = {
                "username": username,
                "to": "+254700000000",  # dummy number for sandbox verification
                "message": "WiBill SMS test",
            }

            r = await client.post(url, data=data, headers=headers)

            if r.status_code == 200:
                resp = r.json()
                # Even if the dummy number fails, a 200 means credentials are valid
                config.status = SmsConfigStatus.VERIFIED
                config.is_verified = True
                config.verified_at = datetime.now(timezone.utc)
                config.last_test_status = "Credentials verified"
                config.last_test_at = datetime.now(timezone.utc)
                await db.commit()
                return {"success": True, "message": "SMS credentials verified"}
            elif r.status_code == 401:
                config.status = SmsConfigStatus.FAILED
                config.last_test_status = "Invalid API key or username"
                config.last_test_at = datetime.now(timezone.utc)
                await db.commit()
                raise HTTPException(status_code=400, detail="Invalid API key or username")
            else:
                config.last_test_status = f"HTTP {r.status_code}"
                config.last_test_at = datetime.now(timezone.utc)
                await db.commit()
                raise HTTPException(status_code=400, detail=f"Unexpected response: {r.status_code}")

    except httpx.TimeoutException:
        config.last_test_status = "Connection timeout"
        config.last_test_at = datetime.now(timezone.utc)
        await db.commit()
        raise HTTPException(status_code=400, detail="Connection timeout — check your network")
    except HTTPException:
        raise
    except Exception as e:
        config.last_test_status = str(e)[:200]
        config.last_test_at = datetime.now(timezone.utc)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@router.delete("/sms/config")
async def delete_sms_config(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete SMS configuration for the ISP."""
    tenant_id_raw = getattr(current_user, "tenant_id", None)
    if not tenant_id_raw:
        raise HTTPException(status_code=400, detail="No tenant on this account")
    tenant_id = UUID(str(tenant_id_raw))

    result = await db.execute(select(SmsConfig).where(SmsConfig.tenant_id == tenant_id))
    config = result.scalar_one_or_none()

    if config:
        await db.delete(config)
        await db.commit()

    return {"success": True}
