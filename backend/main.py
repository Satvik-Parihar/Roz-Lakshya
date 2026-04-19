from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine, init_db
from app.routers import tasks, complaints, dashboard, alerts, users
from app.services.scheduler import start_scheduler, stop_scheduler


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await init_db()
        # Safe column migration for TS-13 admin priority override fields.
        async with engine.begin() as conn:
            await conn.execute(text("SET LOCAL statement_timeout = '120000ms'"))
            await conn.execute(text("SET LOCAL lock_timeout = '15000ms'"))

            # User auth/admin flow migration fields.
            for stmt in [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_domain VARCHAR(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT false",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_id INTEGER",
            ]:
                try:
                    async with engine.begin() as conn:
                        await conn.execute(text(stmt))
                except Exception as exc:
                    logger.warning("User migration statement failed: %s | %s", stmt, exc)

            try:
                async with engine.begin() as conn:
                    await conn.execute(
                        text(
                            "UPDATE users "
                            "SET email = lower(regexp_replace(coalesce(name, 'employee'), '[^a-zA-Z0-9]+', '.', 'g')) "
                            "|| id || '@employee.local' "
                            "WHERE email IS NULL"
                        )
                    )
                    await conn.execute(
                        text(
                            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_not_null "
                            "ON users (email) WHERE email IS NOT NULL"
                        )
                    )
            except Exception as exc:
                logger.warning("Dummy employee email migration failed: %s", exc)

            for col, defval in [
                ("manual_priority_boost", "0.0"),
                ("is_pinned", "false"),
            ]:
                try:
                    async with engine.begin() as conn:
                        await conn.execute(
                            text(
                                f"ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "
                                f"{col} {'FLOAT' if 'boost' in col else 'BOOLEAN'} "
                                f"DEFAULT {defval}"
                            )
                        )
                except Exception as exc:
                    logger.warning("TS-13 startup migration failed for %s: %s", col, exc)

            for idx_stmt in [
                "CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id)",
                "CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_tasks_task_id_desc ON tasks(task_id DESC)",
                "CREATE INDEX IF NOT EXISTS idx_users_company_name ON users(company_name)",
                "CREATE INDEX IF NOT EXISTS idx_users_created_by_id ON users(created_by_id)",
            ]:
                try:
                    async with engine.begin() as conn:
                        await conn.execute(text(idx_stmt))
                except Exception as exc:
                    logger.warning("Index creation failed: %s | %s", idx_stmt, exc)
        app.state.db_ready = True
    except Exception as exc:
        # Keep API bootable for non-DB routes (e.g. auth) when DB is temporarily unavailable.
        app.state.db_ready = False
        logger.warning("Database init failed at startup: %s", exc)

    if settings.ENABLE_SCHEDULER:
        start_scheduler()
    yield

    # Shutdown
    if settings.ENABLE_SCHEDULER:
        stop_scheduler()


app = FastAPI(
    title="Roz-Lakshya",
    description="Daily task & complaint management platform",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(tasks.router, prefix=API_PREFIX)
app.include_router(complaints.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Root health-check
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"app": "Roz-Lakshya", "status": "running"}
