from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# Async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",
    future=True,
    # HINT: Supabase/PgBouncer doesn't support prepared statements in transaction mode
    connect_args={
        "prepared_statement_cache_size": 0,
    }
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Base class for ORM models
class Base(DeclarativeBase):
    pass


# FastAPI dependency — yields an async DB session
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()



