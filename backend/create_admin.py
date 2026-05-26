import asyncio
from uuid import uuid4
from datetime import datetime, timezone
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# 1. Force load the entire application sequence to satisfy all SQLAlchemy relationships
import app.main

from app.core.config import settings
from app.models.admin_user import AdminUser, AdminRole

async def create_first_admin():
    # 2. Initialize password hashing
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    plain_password = "1233999"
    password_bytes = plain_password.encode('utf-8')
    hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
    
    # 3. Connect to database
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        email = "chriskiarie14@gmail.com"
        
        # 4. Construct the Platform Admin record
        admin = AdminUser(
            id=uuid4(),
            email=email,
            hashed_password=hashed_password,
            full_name="Chris Kiarie",
            role=AdminRole.PLATFORM_ADMIN,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(admin)
        await db.commit()
        print(f"\n🚀 SUCCESS: Platform Admin '{email}' has been permanently created in the database!")

if __name__ == "__main__":
    asyncio.run(create_first_admin())