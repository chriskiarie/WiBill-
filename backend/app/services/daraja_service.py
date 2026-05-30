"""
backend/app/services/daraja_service.py
Safaricom Daraja API integration -- STK Push only.
"""

import httpx
import base64
from datetime import datetime
from uuid import UUID
from decimal import Decimal
import logging

from app.core.config import settings
from app.services.crypto_service import decrypt

logger = logging.getLogger(__name__)


def _get_timestamp() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _get_password(shortcode: str, passkey: str, timestamp: str) -> str:
    raw = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(raw.encode()).decode()


async def get_access_token(consumer_key: str, consumer_secret: str) -> str:
    """Get OAuth token from Daraja."""
    url = f"{settings.DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    credentials = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Basic {credentials}"},
        )
        response.raise_for_status()
        data = response.json()
        return data["access_token"]


async def initiate_stk_push(
    *,
    consumer_key_enc: str,
    consumer_secret_enc: str,
    shortcode: str,
    passkey_enc: str,
    phone_number: str,
    amount: Decimal,
    account_reference: str,
    description: str,
    callback_url: str,
) -> dict:
    """
    Send STK push to customer's phone.
    Returns Daraja response with MerchantRequestID and CheckoutRequestID.

    phone_number must be in format: 254XXXXXXXXX (no + prefix)
    """
    consumer_key = decrypt(consumer_key_enc)
    consumer_secret = decrypt(consumer_secret_enc)
    passkey = decrypt(passkey_enc)

    token = await get_access_token(consumer_key, consumer_secret)
    timestamp = _get_timestamp()
    password = _get_password(shortcode, passkey, timestamp)

    # Normalize phone number
    phone = phone_number.strip().replace("+", "").replace(" ", "")
    if phone.startswith("0"):
        phone = "254" + phone[1:]

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),  # Daraja requires integer
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": account_reference[:12],  # Max 12 chars
        "TransactionDesc": description[:13],  # Max 13 chars
    }

    url = f"{settings.DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        return response.json()


async def query_stk_status(
    *,
    consumer_key_enc: str,
    consumer_secret_enc: str,
    shortcode: str,
    passkey_enc: str,
    checkout_request_id: str,
) -> dict:
    """
    Query the status of an STK push request.
    Use this when polling for payment status.
    """
    consumer_key = decrypt(consumer_key_enc)
    consumer_secret = decrypt(consumer_secret_enc)
    passkey = decrypt(passkey_enc)

    token = await get_access_token(consumer_key, consumer_secret)
    timestamp = _get_timestamp()
    password = _get_password(shortcode, passkey, timestamp)

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }

    url = f"{settings.DARAJA_BASE_URL}/mpesa/stkpushquery/v1/query"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        return response.json()