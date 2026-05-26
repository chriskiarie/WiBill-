import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text
import json

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text(
            'SELECT t.slug, t.portal_config, au.onboarding_complete FROM tenants t JOIN admin_users au ON au.tenant_id = t.id WHERE au.email = :email'
        ), {'email': 'wagwan@ma.il'})
        row = result.one_or_none()
        if row:
            print(f'ISP Slug: {row[0]}')
            print(f'Portal Config:')
            if row[1]:
                print(json.dumps(row[1], indent=2))
            else:
                print('NULL')
            print(f'Onboarding Complete: {row[2]}')
        else:
            print('User not found')

asyncio.run(check())
