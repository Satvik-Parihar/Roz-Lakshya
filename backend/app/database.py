from uuid import uuid4
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


logger = logging.getLogger(__name__)


# Async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.SQL_ECHO,
    future=True,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    # Support both unstable networks and Supabase/PgBouncer setups.
    connect_args={
        "timeout": 10,
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4().hex}__",
    },
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


# Initialise database — creates all tables (dev convenience, use Alembic in prod)
async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        users_columns_result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = 'users'"
            )
        )
        users_columns = {str(row[0]) for row in users_columns_result.fetchall()}

        tasks_columns_result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = 'tasks'"
            )
        )
        tasks_columns = {str(row[0]) for row in tasks_columns_result.fetchall()}

        # Apply only missing legacy columns; avoid repeated ALTER work on every startup.
        user_compat_columns = {
            "email": "VARCHAR(255)",
            "password_hash": "VARCHAR(255)",
            "is_admin": "BOOLEAN DEFAULT false",
            "company_name": "VARCHAR(255)",
            "company_domain": "VARCHAR(255)",
            "must_reset_password": "BOOLEAN DEFAULT false",
            "created_by_id": "INTEGER",
        }

        for column_name, column_type in user_compat_columns.items():
            if column_name in users_columns:
                continue
            logger.warning("Applying one-time users schema repair: adding column %s", column_name)
            await conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"))

        task_compat_columns = {
            "manual_priority_boost": "FLOAT DEFAULT 0.0",
            "is_pinned": "BOOLEAN DEFAULT false",
        }

        for column_name, column_type in task_compat_columns.items():
            if column_name in tasks_columns:
                continue
            logger.warning("Applying one-time tasks schema repair: adding column %s", column_name)
            await conn.execute(text(f"ALTER TABLE tasks ADD COLUMN {column_name} {column_type}"))

        await conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_not_null "
                "ON users (email) WHERE email IS NOT NULL"
            )
        )



