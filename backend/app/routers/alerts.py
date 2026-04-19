import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import Alert
from app.security import ensure_password_reset_completed, get_current_user

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"],
)


def _serialize_alert(alert: Alert) -> dict:
    return {
        "id": alert.id,
        "type": alert.type,
        "message": alert.message,
        "task_id": alert.task_id,
        "complaint_id": alert.complaint_id,
        "is_read": bool(alert.is_read),
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
    }


@router.get("/active")
async def get_active_alerts(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    try:
        result = await db.execute(
            select(Alert)
            .where(Alert.is_read.is_(False))
            .order_by(Alert.created_at.desc())
        )
        alerts = result.scalars().all()
        return [_serialize_alert(alert) for alert in alerts]
    except Exception:
        return []


@router.patch("/read-all")
async def mark_all_alerts_read(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    try:
        stmt = sa_update(Alert).where(Alert.is_read == False).values(is_read=True)
        result = await db.execute(stmt)
        await db.commit()
        return {"marked_read": int(result.rowcount or 0)}
    except Exception:
        return {"marked_read": 0}


@router.patch("/{alert_id}/read")
async def mark_alert_read(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    try:
        result = await db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalars().first()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")

        alert.is_read = True
        await db.commit()
        await db.refresh(alert)
        return _serialize_alert(alert)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to mark alert as read: {exc}")


@router.post("/trigger-check")
async def trigger_alert_check(current_user=Depends(get_current_user)):
    """Manually trigger deadline and SLA checks (demo helper)."""
    ensure_password_reset_completed(current_user)

    try:
        from app.services.scheduler import check_sla_breaches, check_task_deadlines

        asyncio.create_task(check_task_deadlines())
        asyncio.create_task(check_sla_breaches())
        return {"triggered": True, "message": "Alert check jobs started"}
    except Exception as exc:
        return {"triggered": False, "error": str(exc)}
