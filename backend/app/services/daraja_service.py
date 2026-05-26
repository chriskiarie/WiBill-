import httpx
import base64
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.mpesa_config import MpesaConfig, DarajaEnvironment
from app.services.crypto_service import decrypt

logger = logging.getLogger("honestbill.daraja")

SANDBOX_URL = "https://sandbox.safaricom.co.ke"
PRODUCTION_URL = "https://api.safaricom.co.ke"


def _base_url(environment: DarajaEnvironment) -> str:
    return SANDBOX_URL if environment == DarajaEnvironment.SANDBOX else PRODUCTION_URL


async def get_config(tenant_id, db: AsyncSession) -> MpesaConfig | None:
    result = await db.execute(
        select(MpesaConfig).where(MpesaConfig.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def get_access_token(config: MpesaConfig) -> str | None:
    """Get OAuth token from Daraja."""
    consumer_key = decrypt(config.consumer_key_enc)
    consumer_secret = decrypt(config.consumer_secret_enc)
    credentials = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()

    url = f"{_base_url(config.environment)}/oauth/v1/generate?grant_type=client_credentials"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                url,
                headers={"Authorization": f"Basic {credentials}"},
            )
            resp.raise_for_status()
            return resp.json().get("access_token")
    except Exception as e:
        logger.error(f"Daraja OAuth failed: {e}")
        return None


def _generate_password(shortcode: str, passkey: str, timestamp: str) -> str:
    """Generate STK Push password."""
    raw = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(raw.encode()).decode()


async def initiate_stk_push(
    tenant_id,
    phone_number: str,
    amount: int,
    session_id: str,
    package_name: str,
    callback_base_url: str,
    db: AsyncSession,
) -> dict:
    """
    Initiate STK Push. Returns dict with success, checkout_request_id, error.
    phone_number must be in format 2547XXXXXXXX
    """
    config = await get_config(tenant_id, db)
    if not config:
        return {"success": False, "error": "M-Pesa not configured for this ISP"}

    # Format phone — convert 07XX or 01XX to 2547XX or 2541XX
    phone = _format_phone(phone_number)
    if not phone:
        return {"success": False, "error": "Invalid phone number format"}

    token = await get_access_token(config)
    if not token:
        return {"success": False, "error": "Could not authenticate with M-Pesa"}

    passkey = decrypt(config.passkey_enc)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    password = _generate_password(config.shortcode, passkey, timestamp)
    callback_url = f"{callback_base_url}/api/mpesa/callback/{tenant_id}"

    payload = {
        "BusinessShortCode": config.shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone,
        "PartyB": config.shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": str(session_id)[:12],  # max 12 chars
        "TransactionDesc": package_name[:13],        # max 13 chars
    }

    url = f"{_base_url(config.environment)}/mpesa/stkpush/v1/processrequest"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()
            logger.info(f"STK Push response: {data}")

            if data.get("ResponseCode") == "0":
                return {
                    "success": True,
                    "checkout_request_id": data.get("CheckoutRequestID"),
                    "merchant_request_id": data.get("MerchantRequestID"),
                }
            else:
                return {
                    "success": False,
                    "error": data.get("errorMessage", "STK Push failed"),
                }
    except Exception as e:
        logger.error(f"STK Push request failed: {e}")
        return {"success": False, "error": "M-Pesa request failed — try again"}


def _format_phone(phone: str) -> str | None:
    """Normalize phone to 2547XXXXXXXX format."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+254"):
        phone = phone[1:]
    elif phone.startswith("0"):
        phone = "254" + phone[1:]
    elif phone.startswith("7") or phone.startswith("1"):
        phone = "254" + phone

    if len(phone) == 12 and phone.startswith("254"):
        return phone
    return None


def extract_callback_data(callback_body: dict) -> dict:
    """
    Parse raw Daraja callback body.
    Returns structured dict with result_code, receipt, amount, phone.
    """
    try:
        stk = callback_body["Body"]["stkCallback"]
        result_code = stk["ResultCode"]
        result_desc = stk["ResultDesc"]
        checkout_request_id = stk["CheckoutRequestID"]

        receipt = None
        amount = None
        phone = None

        if result_code == 0:
            items = stk.get("CallbackMetadata", {}).get("Item", [])
            for item in items:
                name = item.get("Name")
                value = item.get("Value")
                if name == "MpesaReceiptNumber":
                    receipt = value
                elif name == "Amount":
                    amount = value
                elif name == "PhoneNumber":
                    phone = str(value)

        return {
            "result_code": result_code,
            "result_desc": result_desc,
            "checkout_request_id": checkout_request_id,
            "receipt": receipt,
            "amount": amount,
            "phone": phone,
            "success": result_code == 0,
        }
    except Exception as e:
        logger.error(f"Failed to parse Daraja callback: {e}")
        return {"result_code": -1, "result_desc": "Parse error", "success": False}