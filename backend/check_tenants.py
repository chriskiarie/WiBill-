# backend/app/debug_tenants.py
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.tenant import Tenant
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(select(Tenant))
        tenants = result.scalars().all()
        print("\n--- REGISTERED TENANT SLUGS ---")
        for t in tenants:
            print(f"Name: {t.name} | Slug: {t.slug}")
        print("-------------------------------\n")

if __name__ == "__main__":
    asyncio.run(main())