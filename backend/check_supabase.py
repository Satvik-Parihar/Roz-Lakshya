import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

DATABASE_URL = "postgresql+asyncpg://postgres.zniwvywnvghszfvfrdlj:pLMIu6uOwEH5te0g@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Connected to Supabase")
        try:
            res = await conn.execute(text("SELECT count(*) FROM users"))
            print("Users count:", res.scalar())
            
            res = await conn.execute(text("SELECT id, name, role, is_admin FROM users LIMIT 10"))
            print("Users data:")
            for u in res:
                print(tuple(u))
        except Exception as e:
            print("Users table error:", e)

        try:
            res = await conn.execute(text("SELECT count(*) FROM tasks"))
            print("Tasks count:", res.scalar())
        except Exception as e:
            print("Tasks table error:", e)

asyncio.run(check())
