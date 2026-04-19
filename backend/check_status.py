import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text('SELECT status, count(*) FROM tasks GROUP BY status'))
        print(res.all())

if __name__ == "__main__":
    asyncio.run(main())
