#!/usr/bin/env python3
"""
Simple script to find the test-isp tenant UUID
Run: python find_tenant_uuid.py
"""

import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Database config (same as your .env)
DATABASE_URL = "postgresql+asyncpg://honestbill:honestbill_dev_secret@localhost:5432/honestbill"

# Minimal Tenant model
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid as uuid_lib

Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_lib.uuid4)
    slug = Column(String, unique=True, index=True)
    name = Column(String)

async def main():
    print("\nFinding test-isp Tenant UUID...\n")
    
    try:
        # Create engine
        engine = create_async_engine(DATABASE_URL)
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        async with async_session() as session:
            # Query for test-isp
            result = await session.execute(
                select(Tenant).where(Tenant.slug == "test-isp")
            )
            tenant = result.scalar_one_or_none()
            
            if tenant:
                print(f"SUCCESS: Found tenant!")
                print(f"  Slug: {tenant.slug}")
                print(f"  Name: {tenant.name}")
                print(f"  UUID: {tenant.id}")
                print(f"\nUse this UUID in your tests: {tenant.id}")
            else:
                print("ERROR: test-isp tenant not found!")
                print("\nListing all tenants:")
                result = await session.execute(select(Tenant))
                for t in result.scalars().all():
                    print(f"  - {t.slug}: {t.id}")
        
        await engine.dispose()
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nAlternative: Use psql directly")
        print("psql postgresql://honestbill:honestbill_dev_secret@localhost:5432/honestbill")
        print("SELECT id, slug, name FROM tenants;")

if __name__ == "__main__":
    asyncio.run(main())