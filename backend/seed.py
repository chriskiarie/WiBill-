"""
Seed script — run once to create:
1. Platform admin user (you)
2. First test tenant (ISP)
3. Test packages for that tenant

Run with: python seed.py
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.services.crypto_service import encrypt
from app.models.admin_user import AdminUser, AdminRole
from app.models.tenant import Tenant
from app.models.package import Package
from app.models.mikrotik_config import MikrotikConfig
from app.models.mpesa_config import MpesaConfig, DarajaEnvironment
from app.models.invoice import Invoice
from app.models.invoice_transaction import InvoiceTransaction
from app.models.invoice_reminder import InvoiceReminder


async def seed():
    async with AsyncSessionLocal() as db:

        # ── 1. Platform Admin (You) ───────────────────────────────────────────
        existing = await db.execute(
            select(AdminUser).where(AdminUser.email == "admin@xwbill.co.ke")
        )
        if not existing.scalar_one_or_none():
            platform_admin = AdminUser(
                email="admin@xwbill.co.ke",
                hashed_password=hash_password("admin1234"),  # CHANGE THIS IMMEDIATELY
                full_name="Chris (Platform Admin)",
                role=AdminRole.PLATFORM_ADMIN,
                tenant_id=None,
                is_active=True,
            )
            db.add(platform_admin)
            print("✓ Platform admin created: admin@xwbill.co.ke / admin1234")
        else:
            print("- Platform admin already exists, skipping")

        # ── 2. Test ISP Tenant ────────────────────────────────────────────────
        existing_tenant = await db.execute(
            select(Tenant).where(Tenant.slug == "test-isp")
        )
        tenant = existing_tenant.scalar_one_or_none()

        if not tenant:
            tenant = Tenant(
                slug="test-isp",
                name="Test ISP Kenya",
                primary_color="#00E676",
                support_phone="0700000000",
                commission_rate=0.10,
                balance_ksh=0.00,
                is_active=True,
            )
            db.add(tenant)
            await db.flush()  # get tenant.id before using it
            print(f"✓ Test tenant created: test-isp (id: {tenant.id})")
        else:
            print(f"- Test tenant already exists (id: {tenant.id})")

        # ── 3. ISP Admin User ─────────────────────────────────────────────────
        existing_isp_admin = await db.execute(
            select(AdminUser).where(AdminUser.email == "isp@test-isp.co.ke")
        )
        if not existing_isp_admin.scalar_one_or_none():
            isp_admin = AdminUser(
                email="isp@test-isp.co.ke",
                hashed_password=hash_password("isp1234"),  # CHANGE THIS
                full_name="Test ISP Admin",
                role=AdminRole.ISP_ADMIN,
                tenant_id=tenant.id,
                is_active=True,
            )
            db.add(isp_admin)
            print("✓ ISP admin created: isp@test-isp.co.ke / isp1234")
        else:
            print("- ISP admin already exists, skipping")

        # ── 4. Test Packages ──────────────────────────────────────────────────
        existing_packages = await db.execute(
            select(Package).where(Package.tenant_id == tenant.id)
        )
        if not existing_packages.scalars().all():
            packages = [
                Package(tenant_id=tenant.id, name="1 Hour",    price_ksh=10,  duration_hours=1,   duration_label="1 Hour",   display_order=1),
                Package(tenant_id=tenant.id, name="2 Hours",   price_ksh=20,  duration_hours=2,   duration_label="2 Hours",  display_order=2),
                Package(tenant_id=tenant.id, name="8 Hours",   price_ksh=50,  duration_hours=8,   duration_label="8 Hours",  display_order=3),
                Package(tenant_id=tenant.id, name="Daily",     price_ksh=80,  duration_hours=24,  duration_label="24 Hours", display_order=4),
                Package(tenant_id=tenant.id, name="Weekly",    price_ksh=280, duration_hours=168, duration_label="7 Days",   display_order=5),
                Package(tenant_id=tenant.id, name="Monthly",   price_ksh=720, duration_hours=720, duration_label="30 Days",  display_order=6),
            ]
            for p in packages:
                db.add(p)
            print(f"✓ {len(packages)} packages created for test-isp")
        else:
            print("- Packages already exist, skipping")

        # ── 5. MikroTik Config (placeholder) ─────────────────────────────────
        existing_mt = await db.execute(
            select(MikrotikConfig).where(MikrotikConfig.tenant_id == tenant.id)
        )
        if not existing_mt.scalar_one_or_none():
            mt_config = MikrotikConfig(
                tenant_id=tenant.id,
                router_ip="192.168.88.1",          # replace with real IP
                api_port=8728,
                api_username="honestbill",
                api_password_enc=encrypt("changeme"),  # replace with real password
                hotspot_server="hotspot1",
            )
            db.add(mt_config)
            print("✓ MikroTik config created (placeholder — update with real values)")
        else:
            print("- MikroTik config already exists, skipping")

        # ── 6. M-Pesa Config (sandbox placeholder) ────────────────────────────
        existing_mpesa = await db.execute(
            select(MpesaConfig).where(MpesaConfig.tenant_id == tenant.id)
        )
        if not existing_mpesa.scalar_one_or_none():
            mpesa_config = MpesaConfig(
                tenant_id=tenant.id,
                shortcode="174379",                        # Daraja sandbox shortcode
                consumer_key_enc=encrypt("REPLACE_WITH_REAL_KEY"),
                consumer_secret_enc=encrypt("REPLACE_WITH_REAL_SECRET"),
                passkey_enc=encrypt("REPLACE_WITH_REAL_PASSKEY"),
                environment=DarajaEnvironment.SANDBOX,
            )
            db.add(mpesa_config)
            print("✓ M-Pesa config created (sandbox — update with real credentials)")
        else:
            print("- M-Pesa config already exists, skipping")

        await db.commit()
        print("\n✓ Seed complete.")
        print("\nLogin credentials:")
        print("  Platform admin: admin@xwbill.co.ke / admin1234")
        print("  ISP admin:      isp@test-isp.co.ke / isp1234")
        print("  Portal URL:     http://localhost:8000/portal/test-isp")
        print("\n⚠ Change passwords before going to production.")


if __name__ == "__main__":
    asyncio.run(seed())