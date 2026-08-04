import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.models.admin_user import AdminUser, AdminRole

def hash_password(password: str) -> str:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)

async def create_admin():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: Set DATABASE_URL environment variable first")
        return
    
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    
    engine = create_async_engine(db_url, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(AdminUser).where(AdminUser.email == "admin@wibill.co.ke"))
        existing = result.scalar_one_or_none()
        if existing:
            print("Admin user already exists")
            return
        
        admin = AdminUser(
            email="admin@wibill.co.ke",
            hashed_password=hash_password("admin123"),
            full_name="Platform Admin",
            role=AdminRole.PLATFORM_ADMIN,
            tenant_id=None,
            is_active=True,
            onboarding_complete=True,
        )
        db.add(admin)
        await db.commit()
        print("Created admin@wibill.co.ke / admin123")

if __name__ == "__main__":
    asyncio.run(create_admin())