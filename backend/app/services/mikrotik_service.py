"""
app/services/mikrotik_service.py - MikroTik RouterOS integration
Phase 3: Stubs for testing
Phase 4: Real API implementation
"""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any


async def create_mikrotik_user(
    tenant_id: str,
    session_id: str,
    mac_address: str,
    ip_address: str,
    username: str,
    password: str,
    expires_at: datetime,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Create user on MikroTik RouterOS via API
    
    Phase 3: Returns mock success response
    Phase 4: Connects to real MikroTik API
    
    Args:
        tenant_id: ISP tenant UUID
        session_id: Session UUID
        mac_address: User's MAC address
        ip_address: User's IP address
        username: MikroTik username (reconnect_code)
        password: Temporary password
        expires_at: Session expiry time
        db: Database session
    
    Returns:
        {"success": bool, "message": str, "user_id": str}
    """
    
    # Phase 3: Mock implementation
    # TODO: Phase 4: Replace with real MikroTik API call
    
    try:
        # For now, just log and return success
        return {
            "success": True,
            "message": f"Mock: MikroTik user '{username}' created",
            "user_id": f"mock_user_{session_id[:8]}",
            "mikrotik_response": {
                "status": "created",
                "username": username,
                "ip_address": ip_address,
                "mac_address": mac_address,
                "expires": expires_at.isoformat()
            }
        }
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Error creating MikroTik user: {str(e)}",
            "user_id": None
        }


async def remove_hotspot_user_by_session(
    tenant_id: str,
    session_id: str,
    db: AsyncSession
) -> dict:
    """
    Remove user from MikroTik by session ID
    Called by session_expiry job when session expires
    
    Phase 3: Mock
    Phase 4: Real MikroTik API
    """
    try:
        return {
            "success": True,
            "message": f"Mock: Removed hotspot user for session {session_id}",
            "removed_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error removing hotspot user: {str(e)}"
        }


async def remove_mikrotik_user(
    tenant_id: str,
    session_id: str,
    username: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Remove user from MikroTik RouterOS via API
    Called when session expires or user disconnects
    
    Phase 3: Mock
    Phase 4: Real API
    """
    
    try:
        # Phase 3: Mock
        return {
            "success": True,
            "message": f"Mock: MikroTik user '{username}' removed",
            "removed_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        return {
            "success": False,
            "message": f"Error removing MikroTik user: {str(e)}"
        }


async def check_mikrotik_connection(
    tenant_id: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Check if MikroTik API is reachable
    Used for health checks
    """
    
    try:
        # Phase 3: Return mock status
        return {
            "connected": True,
            "status": "Mock MikroTik connection",
            "api_version": "mock_v1"
        }
    
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }


async def get_active_users(
    tenant_id: str,
    db: AsyncSession
) -> list:
    """
    Get list of active users on MikroTik for this tenant
    Used for monitoring
    """
    
    # Phase 3: Mock empty list
    # Phase 4: Query real MikroTik API
    return []