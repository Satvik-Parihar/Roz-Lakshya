from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import Alert

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
async def get_active_alerts(db: AsyncSession = Depends(get_db)):
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
async def mark_all_alerts_read(db: AsyncSession = Depends(get_db)):
    try:
        stmt = sa_update(Alert).where(Alert.is_read == False).values(is_read=True)
        result = await db.execute(stmt)
        await db.commit()
        return {"marked_read": int(result.rowcount or 0)}
    except Exception:
        return {"marked_read": 0}


@router.patch("/{alert_id}/read")
async def mark_alert_read(alert_id: int, db: AsyncSession = Depends(get_db)):
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
