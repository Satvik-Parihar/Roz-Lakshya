from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import tasks, complaints, dashboard, alerts, users


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await init_db()
        app.state.db_ready = True
    except Exception as exc:
        # Keep API bootable for non-DB routes (e.g. auth) when DB is temporarily unavailable.
        app.state.db_ready = False
        logger.warning("Database init failed at startup: %s", exc)
    yield
    # Shutdown (add cleanup here if needed)


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
