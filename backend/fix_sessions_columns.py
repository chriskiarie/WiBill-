"""Fix all missing columns on the sessions table (nuclear approach)."""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

COLUMNS_TO_ENSURE = [
    ("phone_number",          "VARCHAR(20)"),
    ("checkout_request_id",   "VARCHAR(100)"),
    ("reconnect_code",        "VARCHAR(32)"),
    ("mikrotik_user_id",      "VARCHAR(128)"),
    ("activated_at",          "TIMESTAMP"),
    ("disconnected_at",       "TIMESTAMP"),
    ("last_seen_at",          "TIMESTAMP"),
]


async def fix():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: Set DATABASE_URL first")
        return

    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        # Get existing columns
        result = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'sessions'
        """))
        existing = {row[0] for row in result.fetchall()}
        print(f"Existing sessions columns: {sorted(existing)}")

        added = 0
        for col_name, col_type in COLUMNS_TO_ENSURE:
            if col_name not in existing:
                sql = f"ALTER TABLE sessions ADD COLUMN {col_name} {col_type}"
                await conn.execute(text(sql))
                print(f"  + Added {col_name} ({col_type})")
                added += 1
            else:
                print(f"  - {col_name} already exists")

        # Add unique constraint on checkout_request_id if missing
        result = await conn.execute(text("""
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'sessions'::regclass AND conname = 'sessions_checkout_request_id_key'
        """))
        if not result.fetchone():
            await conn.execute(text("""
                ALTER TABLE sessions ADD CONSTRAINT sessions_checkout_request_id_key
                UNIQUE (checkout_request_id)
            """))
            print("  + Added unique constraint on checkout_request_id")

        # Add unique constraint on reconnect_code if missing
        result = await conn.execute(text("""
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'sessions'::regclass AND conname = 'sessions_reconnect_code_key'
        """))
        if not result.fetchone():
            await conn.execute(text("""
                ALTER TABLE sessions ADD CONSTRAINT sessions_reconnect_code_key
                UNIQUE (reconnect_code)
            """))
            print("  + Added unique constraint on reconnect_code")

        await conn.commit()
        print(f"\nDone. Added {added} columns.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(fix())
