import asyncio
from sqlalchemy import text, func, select
from app.database import AsyncSessionLocal
from app.models import User, Task

async def main():
    async with AsyncSessionLocal() as db:
        user_count = await db.scalar(select(func.count(User.id)))
        print(f"Total Users: {user_count}")
        
        # Reset all task statuses to 'todo'
        await db.execute(text("UPDATE tasks SET status = 'todo'"))
        print("Set all tasks to 'todo'")
        
        # Assign some tasks to 'in-progress' randomly for variety (first 50)
        await db.execute(text("UPDATE tasks SET status = 'in-progress' WHERE id IN (SELECT id FROM tasks LIMIT 50)"))
        print("Set 50 tasks to 'in-progress'")
        
        await db.commit()

if __name__ == "__main__":
    asyncio.run(main())
