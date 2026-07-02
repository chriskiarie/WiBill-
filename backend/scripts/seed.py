"""
Seed script — creates:
1. Platform admin: admin@xwbill.co.ke / admin1234
2. Test ISP tenant + its admin: isp@test-isp.co.ke / isp1234

Safe to run multiple times (upsert pattern).
Run: python -m scripts.seed
"""
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.admin_user import AdminUser, AdminRole
from app.models.tenant import Tenant
from app.models.invoice import Invoice
from app.models.invoice_transaction import InvoiceTransaction
from app.models.invoice_reminder import InvoiceReminder


async def seed():
    async with AsyncSessionLocal() as db:

        # ── 1. Platform Admin ───────────────────────────────────────────
        result = await db.execute(
            select(AdminUser).where(AdminUser.email == "admin@xwbill.co.ke")
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.hashed_password = hash_password("admin1234")
            existing.is_active = True
            print("~ Platform admin updated: admin@xwbill.co.ke / admin1234")
        else:
            db.add(AdminUser(
                email="admin@xwbill.co.ke",
                hashed_password=hash_password("admin1234"),
                full_name="Platform Admin",
                role=AdminRole.PLATFORM_ADMIN,
                tenant_id=None,
                is_active=True,
            ))
            print("✓ Platform admin created: admin@xwbill.co.ke / admin1234")

        # ── 2. Test ISP Tenant ─────────────────────────────────────────
        result = await db.execute(
            select(Tenant).where(Tenant.slug == "test-isp")
        )
        tenant = result.scalar_one_or_none()
        if tenant:
            tenant.name = "Test ISP"
            tenant.is_active = True
            print(f"~ Test ISP updated (id: {tenant.id})")
        else:
            tenant = Tenant(
                slug="test-isp",
                name="Test ISP",
                primary_color="#00E676",
                support_phone="0700000000",
                commission_rate=0.10,
                balance_ksh=0.00,
                is_active=True,
            )
            db.add(tenant)
            await db.flush()
            print(f"✓ Test ISP created (id: {tenant.id})")

        # ── 3. ISP Admin ───────────────────────────────────────────────
        result = await db.execute(
            select(AdminUser).where(AdminUser.email == "isp@test-isp.co.ke")
        )
        isp_admin = result.scalar_one_or_none()
        if isp_admin:
            isp_admin.hashed_password = hash_password("isp1234")
            isp_admin.tenant_id = tenant.id
            isp_admin.is_active = True
            print("~ ISP admin updated: isp@test-isp.co.ke / isp1234")
        else:
            db.add(AdminUser(
                email="isp@test-isp.co.ke",
                hashed_password=hash_password("isp1234"),
                full_name="Test ISP Admin",
                role=AdminRole.ISP_ADMIN,
                tenant_id=tenant.id,
                is_active=True,
            ))
            print("✓ ISP admin created: isp@test-isp.co.ke / isp1234")

        await db.commit()
        print("\n✓ Seed complete.")
        print("  Platform admin: admin@xwbill.co.ke / admin1234")
        print("  ISP admin:      isp@test-isp.co.ke / isp1234")


if __name__ == "__main__":
    asyncio.run(seed())
