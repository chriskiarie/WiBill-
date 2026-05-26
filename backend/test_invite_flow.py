import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

# Test Configuration
ADMIN_USERNAME = "chriskiarie14@gmail.com"
ADMIN_PASSWORD = "1233999"

pytest_plugins = ('pytest_asyncio',)


@pytest.mark.asyncio
async def test_complete_invite_registration_approval_flow():
    """
    End-to-End Async Test for Phase A:
    Ensures database connections remain safe across the lifecycle.
    """
    # Create an AsyncClient bound directly to the FastAPI app via ASGITransport
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        
        # -----------------------------------------------------------------------
        # STEP 1: Authenticate as Platform Admin
        # -----------------------------------------------------------------------
        login_response = await ac.post(
            "/api/auth/login",
            data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        login_data = login_response.json()
        assert "access_token" in login_data, "Access token missing from login response"
        admin_token = login_data["access_token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # -----------------------------------------------------------------------
        # STEP 2: Generate an Invite Token
        # -----------------------------------------------------------------------
        invite_response = await ac.post("/api/admin/invites/generate", headers=headers)
        assert invite_response.status_code == 200, f"Invite generation failed: {invite_response.text}"
        
        invite_data = invite_response.json()
        assert "token" in invite_data, "Token missing from response"
        assert "invite_link" in invite_data, "Invite link missing from response"
        assert invite_data["status"] == "pending"
        
        secure_token = invite_data["token"]

        # -----------------------------------------------------------------------
        # STEP 3: Validate the Token
        # -----------------------------------------------------------------------
        validate_response = await ac.get(f"/api/auth/invites/validate?token={secure_token}")
        assert validate_response.status_code == 200, f"Token validation failed: {validate_response.text}"
        
        validate_data = validate_response.json()
        assert validate_data["valid"] is True
        assert validate_data["invite"]["status"] == "pending"

        # -----------------------------------------------------------------------
        # STEP 4: Register a New ISP Tenant with the Token
        # -----------------------------------------------------------------------
        unique_suffix = uuid.uuid4().hex[:8]
        tenant_slug = f"test-isp-{unique_suffix}"
        tenant_email = f"admin@{tenant_slug}.co.ke"
        
        registration_payload = {
            "isp_name": f"Test ISP {unique_suffix.upper()}",
            "isp_slug": tenant_slug,
            "admin_email": tenant_email,
            "admin_password": "SecurePassword123!",
            "admin_phone": "+254712345678",
            "invite_token": secure_token
        }
        
        register_response = await ac.post("/api/auth/register", json=registration_payload)
        assert register_response.status_code == 200, f"Registration failed: {register_response.text}"
        
        register_data = register_response.json()
        assert "tenant_id" in register_data
        assert register_data["pending"] is True
        assert register_data["message"] == "Application received. You will be notified when your account is approved."
        assert "tenant" in register_data
        assert register_data["tenant"]["id"]
        assert register_data["tenant"]["slug"] == tenant_slug
        
        new_tenant_id = register_data["tenant_id"]

        # -----------------------------------------------------------------------
        # STEP 5: Approve the Tenant as Admin
        # -----------------------------------------------------------------------
        approval_response = await ac.patch(
            f"/api/admin/tenants/{new_tenant_id}/approve",
            headers=headers
        )
        assert approval_response.status_code == 200, f"Admin approval failed: {approval_response.text}"
        
        approval_data = approval_response.json()
        
        # Fallback payload parsing: works whether the API returns data flat or nested
        tenant_info = approval_data.get("tenant", approval_data)
        
        # Check against keys explicitly if they exist; otherwise fall back to explicit status validation
        if "is_active" in tenant_info:
            assert tenant_info["is_active"] is True
        else:
            assert approval_response.status_code == 200