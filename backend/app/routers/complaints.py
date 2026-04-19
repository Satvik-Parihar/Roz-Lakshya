from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Complaint, Task, User
from app.security import ensure_password_reset_completed, get_current_user
from app.schemas import ComplaintCreate, ComplaintResponse, ComplaintUpdate

try:
    from app.services.ai_engine import classify_complaint, compute_priority_score
except ImportError:
    async def classify_complaint(*args, **kwargs):
        return {
            "category": "Other", "priority": "Medium", "urgency_score": 50.0,
            "resolution_steps": ["Review complaint"], "linked_task_id": None, "sla_hours": 8
        }
    async def compute_priority_score(*args, **kwargs):
        return {"score": 50.0, "reasoning": "Fallback"}

router = APIRouter(prefix="/complaints", tags=["Complaints"])


def _label_for_score(score: float) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def _as_complaint_response(complaint: Complaint, linked_task: Task | None = None, linked_member_name: str | None = None) -> dict:
    return {
        "id": complaint.id,
        "text": complaint.text,
        "channel": complaint.channel,
        "category": complaint.category,
        "priority": complaint.priority,
        "urgency_score": float(complaint.urgency_score or 0.0),
        "resolution_steps": complaint.resolution_steps,
        "linked_task_id": complaint.linked_task_id,
        "linked_task_number": linked_task.task_id if linked_task else None,
        "linked_member_name": linked_member_name,
        "sla_hours": complaint.sla_hours,
        "status": complaint.status,
        "created_at": complaint.created_at,
    }

@router.post("/", response_model=ComplaintResponse)
async def create_complaint(
    payload: ComplaintCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    # 1. Fetch available tasks for AI matching
    stmt = select(Task.id, Task.task_id, Task.title, Task.assignee_id).filter(Task.status != "done")
    res = await db.execute(stmt)
    available_task_rows = res.all()
    available_tasks = [{"id": r.id, "title": r.title} for r in available_task_rows]

    # 2. AI Classification
    ai_result = await classify_complaint(payload.text, payload.channel, available_tasks)

    linked_task_id = payload.linked_task_id if payload.linked_task_id is not None else ai_result.get("linked_task_id")

    linked_task = None
    if linked_task_id is not None:
        task_stmt = select(Task).where(Task.id == linked_task_id)
        task_res = await db.execute(task_stmt)
        linked_task = task_res.scalars().first()
        if linked_task is None:
            raise HTTPException(status_code=422, detail="Selected task not found")

    # 3. Create Complaint
    new_complaint = Complaint(
        text=payload.text,
        channel=payload.channel,
        category=ai_result.get("category"),
        priority=ai_result.get("priority"),
        urgency_score=ai_result.get("urgency_score", 0.0),
        resolution_steps=ai_result.get("resolution_steps"),
        linked_task_id=linked_task_id,
        sla_hours=ai_result.get("sla_hours", 24),
        sla_deadline=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=int(ai_result.get("sla_hours", 24) or 24)),
        status="open"
    )
    db.add(new_complaint)
    await db.flush()

    # 4. Dynamic bridge: linked complaints boost and immediately rescore the task.
    if linked_task is not None:
        urgency = float(ai_result.get("urgency_score", 0.0) or 0.0)
        boost_amt = max(0.0, min(100.0, urgency)) * 0.3
        linked_task.complaint_boost = float(linked_task.complaint_boost or 0.0) + boost_amt

        task_data = {
            "id": linked_task.id,
            "title": linked_task.title,
            "deadline_days": linked_task.deadline_days,
            "effort": linked_task.effort,
            "impact": linked_task.impact,
            "workload": linked_task.workload,
            "complaint_boost": linked_task.complaint_boost,
            "status": linked_task.status,
            "manual_priority_boost": linked_task.manual_priority_boost,
            "is_pinned": linked_task.is_pinned,
        }
        new_ai_res = await compute_priority_score(task_data)
        score = float(new_ai_res.get("score", linked_task.priority_score or 50.0))
        linked_task.priority_score = score
        linked_task.priority_label = _label_for_score(score)
        linked_task.ai_reasoning = new_ai_res.get("reasoning", linked_task.ai_reasoning or "Score unavailable")
        linked_task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    await db.commit()
    await db.refresh(new_complaint)

    linked_member_name = None
    if linked_task is not None and linked_task.assignee_id:
        user_res = await db.execute(select(User.name).where(User.id == linked_task.assignee_id))
        linked_member_name = user_res.scalar()

    return _as_complaint_response(new_complaint, linked_task=linked_task, linked_member_name=linked_member_name)

@router.get("/", response_model=List[ComplaintResponse])
async def list_complaints(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    await db.execute(text("SET LOCAL statement_timeout = '12000ms'"))
    safe_limit = max(1, min(limit, 200))

    stmt = select(Complaint).offset(skip).limit(safe_limit).order_by(Complaint.id.desc())
    try:
        res = await db.execute(stmt)
    except DBAPIError:
        return []
    complaints = res.scalars().all()
    if not complaints:
        return []

    linked_ids = [c.linked_task_id for c in complaints if c.linked_task_id is not None]
    task_map: dict[int, Task] = {}
    member_name_map: dict[int, str | None] = {}

    if linked_ids:
        tasks_res = await db.execute(select(Task).where(Task.id.in_(linked_ids)))
        tasks = tasks_res.scalars().all()
        task_map = {t.id: t for t in tasks}

        assignee_ids = [t.assignee_id for t in tasks if t.assignee_id is not None]
        if assignee_ids:
            names_res = await db.execute(select(User.id, User.name).where(User.id.in_(assignee_ids)))
            member_name_map = {uid: name for uid, name in names_res.all()}

    return [
        _as_complaint_response(
            c,
            linked_task=task_map.get(c.linked_task_id) if c.linked_task_id is not None else None,
            linked_member_name=member_name_map.get(task_map[c.linked_task_id].assignee_id) if c.linked_task_id in task_map and task_map[c.linked_task_id].assignee_id is not None else None,
        )
        for c in complaints
    ]

@router.patch("/{id}/status", response_model=ComplaintResponse)
async def update_complaint_status(
    id: int,
    payload: ComplaintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    stmt = select(Complaint).filter(Complaint.id == id)
    res = await db.execute(stmt)
    complaint = res.scalars().first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    complaint.status = payload.status
    await db.commit()
    await db.refresh(complaint)

    linked_task = None
    linked_member_name = None
    if complaint.linked_task_id is not None:
        task_res = await db.execute(select(Task).where(Task.id == complaint.linked_task_id))
        linked_task = task_res.scalars().first()
        if linked_task is not None and linked_task.assignee_id is not None:
            member_res = await db.execute(select(User.name).where(User.id == linked_task.assignee_id))
            linked_member_name = member_res.scalar()

    return _as_complaint_response(complaint, linked_task=linked_task, linked_member_name=linked_member_name)
