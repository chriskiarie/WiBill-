"""
app/services/daraja_service.py - Safaricom M-Pesa Daraja API integration
Phase 3: Stubs for testing payment flow
Phase 4: Real API implementation
"""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
import uuid


async def initiate_stk_push(
    tenant_id: str,
    phone_number: str,
    amount: int,
    session_id: str,
    package_name: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Initiate M-Pesa STK Push (payment prompt on user's phone)
    
    Phase 3: Returns mock response with CheckoutRequestID
    Phase 4: Connects to real Safaricom Daraja API
    
    Args:
        tenant_id: ISP tenant UUID
        phone_number: M-Pesa phone number (e.g., 254712345678)
        amount: Amount in KSH
        session_id: Session UUID
        package_name: Package name for display
        db: Database session
    
    Returns:
        {
            "success": bool,
            "message": str,
            "checkout_request_id": str,
            "response_code": str
        }
    """
    
    try:
        # Phase 3: Mock STK push
        # In Phase 4, this will call: https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
        # or production endpoint
        
        checkout_request_id = f"WEB_{uuid.uuid4().hex[:16].upper()}"
        
        return {
            "success": True,
            "message": f"Mock: STK push sent to {phone_number} for KSH {amount} ({package_name})",
            "checkout_request_id": checkout_request_id,
            "response_code": "0",
            "response_description": "Success. Request accepted for processing",
            "customer_message": "Success. Request accepted for processing. Wait for the prompt on your phone.",
            "mock_note": "In Phase 4, user will see actual M-Pesa prompt. For now, you must manually confirm via /activate endpoint."
        }
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Error initiating STK push: {str(e)}",
            "checkout_request_id": None,
            "response_code": "1",
            "response_description": "Failed"
        }


async def check_payment_status(
    checkout_request_id: str,
    tenant_id: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Check status of a checkout request
    Called by polling endpoint to check if user completed payment
    
    Phase 3: Always returns pending (mock)
    Phase 4: Queries real M-Pesa status
    """
    
    try:
        # Phase 3: Mock pending status
        # Phase 4: Call M-Pesa QueryPaymentRequest API
        
        return {
            "checkout_request_id": checkout_request_id,
            "status": "pending",
            "message": "Awaiting user to enter M-Pesa PIN",
            "result_code": None
        }
    
    except Exception as e:
        return {
            "checkout_request_id": checkout_request_id,
            "status": "error",
            "message": str(e)
        }


async def verify_callback_signature(
    timestamp: str,
    signature: str,
    secret_key: str
) -> bool:
    """
    Verify M-Pesa callback signature
    Ensures callback is really from Safaricom
    """
    
    import hmac
    import hashlib
    
    try:
        # Reconstruct the signature
        message = f"{secret_key}{timestamp}"
        expected_sig = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature == expected_sig
    
    except Exception:
        return False


async def handle_payment_callback(
    callback_data: Dict[str, Any],
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Handle M-Pesa payment callback (called by M-Pesa after user pays)
    
    Callback contains:
    - checkout_request_id: Links to session
    - result_code: 0 = success, else = failure
    - result_desc: Description
    - mpesa_receipt_number: Transaction ID
    - amount: Paid amount
    - phone_number: User's M-Pesa number
    
    Phase 3: Mock - doesn't actually receive callbacks
    Phase 4: Real callback handling from Safaricom
    """
    
    try:
        checkout_request_id = callback_data.get("checkout_request_id")
        result_code = callback_data.get("result_code")
        
        if result_code == 0:
            # Payment successful
            return {
                "success": True,
                "message": "Payment confirmed",
                "checkout_request_id": checkout_request_id,
                "action": "activate_session"
            }
        else:
            # Payment failed
            return {
                "success": False,
                "message": f"Payment failed: {callback_data.get('result_desc')}",
                "checkout_request_id": checkout_request_id
            }
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Error processing callback: {str(e)}"
        }


def extract_callback_data(callback_response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract relevant data from M-Pesa callback response
    
    M-Pesa sends nested JSON. This extracts the key fields we care about.
    """
    
    try:
        body = callback_response.get("Body", {})
        stk_callback = body.get("stkCallback", {})
        
        return {
            "checkout_request_id": stk_callback.get("CheckoutRequestID"),
            "result_code": stk_callback.get("ResultCode"),
            "result_desc": stk_callback.get("ResultDesc"),
            "merchant_request_id": stk_callback.get("MerchantRequestID"),
            "callback_metadata": stk_callback.get("CallbackMetadata", {})
        }
    
    except Exception as e:
        return {
            "error": str(e),
            "raw_response": callback_response
        }


def mock_receive_callback(session_id: str) -> Dict[str, Any]:
    """
    Simulates receiving a successful M-Pesa callback
    Used for testing Phase 3 without real M-Pesa
    
    Usage:
        callback_data = mock_receive_callback(session_id)
        result = await handle_payment_callback(callback_data, db)
    """
    
    return {
        "checkout_request_id": f"WEB_{uuid.uuid4().hex[:16].upper()}",
        "result_code": 0,
        "result_desc": "The service request has been accepted successfully",
        "mpesa_receipt_number": f"PF4GJZCXXX",
        "amount": 150.0,
        "phone_number": "254712345678",
        "transaction_date": datetime.utcnow().isoformat()
    }