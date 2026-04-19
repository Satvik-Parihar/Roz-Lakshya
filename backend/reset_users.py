import asyncio
import os
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User
from app.security import hash_password

async def main():
    async with AsyncSessionLocal() as db:
        users_result = await db.execute(select(User).limit(10))
        users = users_result.scalars().all()
        
        default_pwd = "RozLakshya123!"
        hashed = hash_password(default_pwd)
        
        print("Users available:")
        for u in users:
            if not u.email:
                continue
            u.password_hash = hashed
            print(f"- Email: {u.email} | Password: {default_pwd} | Role: {u.role}")
        
        await db.commit()

if __name__ == "__main__":
    asyncio.run(main())
