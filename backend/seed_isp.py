"""
Seed script: creates a platform admin + an ISP account on a fresh Railway database.

Usage (on Railway shell):
  export DATABASE_URL="${DATABASE_URL/postgresql:// postgresql+asyncpg://}"
  python seed_isp.py

Or with custom credentials:
  python seed_isp.py --email admin@test.com --password secret123 --isp-name "My ISP" --isp-slug my-isp
"""
import asyncio
import os
import sys
import uuid
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.admin_user import AdminUser, AdminRole
from app.models.tenant import Tenant


def hash_password(password: str) -> str:
    """Bcrypt hash — matches passlib.CryptContext used in auth.py"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)


async def seed(
    email: str = "admin@wibill.co.ke",
    password: str = "admin123",
    isp_name: str = "Test ISP",
    isp_slug: str = "test-isp",
):
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: Set DATABASE_URL environment variable first")
        return

    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # ── 1. Platform Admin ──
        result = await db.execute(select(AdminUser).where(AdminUser.email == email))
        if result.scalar_one_or_none():
            print(f"Platform admin {email} already exists")
        else:
            admin = AdminUser(
                id=uuid.uuid4(),
                email=email,
                username=email,
                hashed_password=hash_password(password),
                full_name="Platform Admin",
                role=AdminRole.PLATFORM_ADMIN,
                tenant_id=None,
                is_active=True,
                onboarding_complete=True,
            )
            db.add(admin)
            await db.commit()
            print(f"Created platform admin: {email} / {password}")

        # ── 2. Tenant (ISP) ──
        result = await db.execute(select(Tenant).where(Tenant.slug == isp_slug))
        tenant = result.scalar_one_or_none()
        if tenant:
            print(f"Tenant '{isp_slug}' already exists (id={tenant.id})")
        else:
            tenant = Tenant(
                id=uuid.uuid4(),
                slug=isp_slug,
                name=isp_name,
                status="active",
                is_active=True,
                primary_color="#00E676",
                currency="KES",
                commission_rate=0.10,
                balance_ksh=0.0,
                has_vouchers=True,
                has_mikrotik=True,
                has_portal_customization=True,
            )
            db.add(tenant)
            await db.commit()
            print(f"Created tenant: {isp_name} (slug={isp_slug}, id={tenant.id})")

        # ── 3. ISP Admin User ──
        isp_email = f"admin@{isp_slug}.com"
        result = await db.execute(select(AdminUser).where(AdminUser.email == isp_email))
        if result.scalar_one_or_none():
            print(f"ISP admin {isp_email} already exists")
        else:
            isp_admin = AdminUser(
                id=uuid.uuid4(),
                email=isp_email,
                username=isp_email,
                hashed_password=hash_password(password),
                full_name=f"{isp_name} Admin",
                role=AdminRole.ISP_ADMIN,
                tenant_id=tenant.id,
                is_active=True,
                onboarding_complete=False,
            )
            db.add(isp_admin)
            await db.commit()
            print(f"Created ISP admin: {isp_email} / {password}")

    await engine.dispose()
    print("\nDone. You can now login at wi-bill.com/login")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed ISP account")
    parser.add_argument("--email", default="admin@wibill.co.ke", help="Platform admin email")
    parser.add_argument("--password", default="admin123", help="Password for all accounts")
    parser.add_argument("--isp-name", default="Test ISP", help="ISP display name")
    parser.add_argument("--isp-slug", default="test-isp", help="ISP URL slug")
    args = parser.parse_args()

    asyncio.run(seed(args.email, args.password, args.isp_name, args.isp_slug))
