import asyncio
from app.core.database import engine
from sqlalchemy import text

async def fix():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE network_events ALTER COLUMN status TYPE VARCHAR(50)"))
        print("network_events.status -> VARCHAR done")
    print("All native enum columns fixed")

asyncio.run(fix())