"""
app/seed_phase_a.py - Seed script for testing Phase A

Run after migration with:
python -m app.seed_phase_a
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models import (
    AdminUser, Tenant, ISPInvite, UserRole, TenantStatus, InviteStatus
)
from app.security import hash_password
from app.database import Base

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def seed_data():
    """Seed test data for Phase A testing"""
    
    async with async_session() as session:
        # 1. Create platform admin if not exists
        platform_admin_id = uuid.uuid4()
        platform_admin = AdminUser(
            id=platform_admin_id,
            email="admin@wibill.co.ke",
            password_hash=hash_password("admin1234"),
            phone="+254700000001",
            role=UserRole.PLATFORM_ADMIN,
            tenant_id=None,
            is_active=True,
            onboarding_complete=True,
            created_at=datetime.utcnow()
        )
        session.add(platform_admin)
        await session.flush()
        print("✓ Platform admin created: admin@wibill.co.ke")

        # 2. Create sample invite links
        for i in range(3):
            invite = ISPInvite(
                id=uuid.uuid4(),
                token=f"test_invite_token_{i}_{uuid.uuid4().hex[:20]}",
                created_by=platform_admin_id,
                status=InviteStatus.PENDING if i < 2 else InviteStatus.EXPIRED,
                expires_at=datetime.utcnow() + timedelta(days=7 if i < 2 else -1),
                created_at=datetime.utcnow()
            )
            session.add(invite)
            print(f"✓ Invite {i+1} created: {invite.token[:20]}...")

        # 3. Create sample pending tenant (ISP awaiting approval)
        pending_tenant_id = uuid.uuid4()
        pending_tenant = Tenant(
            id=pending_tenant_id,
            name="Test ISP Pending",
            slug="test-isp-pending",
            status=TenantStatus.PENDING,
            is_active=False,
            created_at=datetime.utcnow()
        )
        session.add(pending_tenant)
        
        pending_admin = AdminUser(
            id=uuid.uuid4(),
            email="pending@test-isp.co.ke",
            password_hash=hash_password("pending1234"),
            phone="+254700000002",
            role=UserRole.ISP_ADMIN,
            tenant_id=pending_tenant_id,
            is_active=True,
            onboarding_complete=False,
            created_at=datetime.utcnow()
        )
        session.add(pending_admin)
        await session.flush()
        print("✓ Pending ISP created: Test ISP Pending (awaiting approval)")
        print("  └─ Admin: pending@test-isp.co.ke / pending1234")

        # 4. Create sample active tenants
        for i in range(2):
            tenant_id = uuid.uuid4()
            tenant = Tenant(
                id=tenant_id,
                name=f"Active ISP {i+1}",
                slug=f"active-isp-{i+1}",
                status=TenantStatus.ACTIVE,
                is_active=True,
                created_at=datetime.utcnow() - timedelta(days=30 - i*10)
            )
            session.add(tenant)
            
            admin = AdminUser(
                id=uuid.uuid4(),
                email=f"admin{i+1}@active-isp-{i+1}.co.ke",
                password_hash=hash_password(f"active{i+1}234"),
                phone=f"+25470000000{3+i}",
                role=UserRole.ISP_ADMIN,
                tenant_id=tenant_id,
                is_active=True,
                onboarding_complete=True if i == 0 else False,
                created_at=datetime.utcnow() - timedelta(days=30 - i*10)
            )
            session.add(admin)
            await session.flush()
            print(f"✓ Active ISP {i+1} created: Active ISP {i+1}")
            print(f"  └─ Admin: admin{i+1}@active-isp-{i+1}.co.ke / active{i+1}234")

        # 5. Create suspended tenant
        suspended_tenant_id = uuid.uuid4()
        suspended_tenant = Tenant(
            id=suspended_tenant_id,
            name="Suspended ISP",
            slug="suspended-isp",
            status=TenantStatus.SUSPENDED,
            is_active=False,
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        session.add(suspended_tenant)
        
        suspended_admin = AdminUser(
            id=uuid.uuid4(),
            email="suspended@isp.co.ke",
            password_hash=hash_password("suspended1234"),
            phone="+254700000005",
            role=UserRole.ISP_ADMIN,
            tenant_id=suspended_tenant_id,
            is_active=False,
            onboarding_complete=False,
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        session.add(suspended_admin)
        await session.flush()
        print("✓ Suspended ISP created: Suspended ISP (deactivated)")
        print("  └─ Admin: suspended@isp.co.ke / suspended1234")

        # Commit all changes
        await session.commit()

        print("\n" + "="*60)
        print("PHASE A SEED DATA COMPLETE")
        print("="*60)
        print("\nTest credentials:")
        print("\nPlatform Admin (Batcave):")
        print("  Email: admin@wibill.co.ke")
        print("  Password: admin1234")
        print("\nISP Admins:")
        print("  Pending ISP:")
        print("    Email: pending@test-isp.co.ke")
        print("    Password: pending1234")
        print("  Active ISP 1:")
        print("    Email: admin1@active-isp-1.co.ke")
        print("    Password: active1234")
        print("  Active ISP 2:")
        print("    Email: admin2@active-isp-2.co.ke")
        print("    Password: active2234")
        print("\nYou can now test:")
        print("1. Login as platform admin")
        print("2. Go to /admin/isp-network")
        print("3. Generate invite links")
        print("4. Approve/reject pending ISPs")
        print("="*60 + "\n")


async def main():
    async with engine.begin() as conn:
        # Drop and recreate tables (optional - for fresh start)
        # await conn.run_sync(Base.metadata.drop_all)
        # await conn.run_sync(Base.metadata.create_all)
        pass

    await seed_data()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
