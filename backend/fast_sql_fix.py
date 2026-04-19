import asyncio
import os
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as db:
        print("Normalizing Priority Scores globally...")
        await db.execute(text("""
            UPDATE tasks 
            SET priority_score = ((priority_score + 5.0) / 45.0) * 100.0
            WHERE priority_score <= 40.0
        """))
        
        print("Recalibrating Priority Labels to 25/25/50 percentiles...")
        await db.execute(text("""
            UPDATE tasks
            SET priority_label = 
                CASE 
                    WHEN priority_score >= 22.5 THEN 'High'
                    WHEN priority_score >= 17.9 THEN 'Medium'
                    ELSE 'Low'
                END
        """))
        
        print("Mass-cleaning 'In Progress' and 'Done' statuses...")
        await db.execute(text("""
            UPDATE tasks
            SET status = 'in-progress'
            WHERE LOWER(status) LIKE '%progress%' OR LOWER(status) LIKE '%doing%' OR LOWER(status) LIKE '%ongoing%';
        """))
        
        await db.execute(text("""
            UPDATE tasks
            SET status = 'done'
            WHERE LOWER(status) LIKE '%done%' OR LOWER(status) LIKE '%completed%';
        """))
        
        print("Committing rapid DB fix.")
        await db.commit()

if __name__ == "__main__":
    asyncio.run(main())
