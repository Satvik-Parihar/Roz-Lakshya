from datetime import datetime, timedelta, timezone
from time import monotonic
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.database import get_db
from app.models import Task, User
from app.security import ensure_password_reset_completed, get_current_user, is_admin_user
from app.schemas import TaskCreate, TaskPriorityOverride, TaskResponse, TaskSequenceItem, TaskUpdate

# Safe import of AI engine - fallback if P2 not ready
try:
    from app.services.ai_engine import compute_priority_score, invalidate_cache, suggest_execution_order
except ImportError:
    async def compute_priority_score(task):
        return {"score": 50.0, "reasoning": "AI engine not yet available"}

    def invalidate_cache(task_id: str):
        return None

    async def suggest_execution_order(tasks):
        return []

router = APIRouter(prefix="/tasks", tags=["Tasks"], redirect_slashes=False)

ALLOWED_TASK_STATUSES = {"todo", "in-progress", "done"}
TASK_RECENT_SCAN_WINDOW = 8000
SEQUENCE_CACHE_TTL_SECONDS = 60.0
SEQUENCE_CACHE_MAX_ITEMS = 120
_sequence_cache: dict[str, tuple[float, list[dict]]] = {}


def _label_for_score(score: float) -> str:
    if score >= 35:
        return "High"
    if score >= 15:
        return "Medium"
    return "Low"


def get_priority_label(score: float) -> str:
    return _label_for_score(score)


def _sequence_cache_key(requested_user_id: int, current_user: User, limit: int) -> str:
    scope = str(current_user.company_name or "-") if is_admin_user(current_user) else "self"
    return f"{current_user.id}:{requested_user_id}:{limit}:{scope}"


def _get_cached_sequence(key: str) -> Optional[list[dict]]:
    cached = _sequence_cache.get(key)
    if not cached:
        return None
    ts, value = cached
    if monotonic() - ts > SEQUENCE_CACHE_TTL_SECONDS:
        _sequence_cache.pop(key, None)
        return None
    return value


def _set_cached_sequence(key: str, value: list[dict]) -> None:
    if len(_sequence_cache) >= SEQUENCE_CACHE_MAX_ITEMS:
        oldest_key = min(_sequence_cache.items(), key=lambda item: item[1][0])[0]
        _sequence_cache.pop(oldest_key, None)
    _sequence_cache[key] = (monotonic(), value)


def _clear_sequence_cache() -> None:
    _sequence_cache.clear()


def normalize_task_status(status: Optional[str], default: str = "todo") -> str:
    if status is None:
        return default

    normalized = str(status).strip().lower().replace("_", "-")
    if normalized in ALLOWED_TASK_STATUSES:
        return normalized

    raise HTTPException(
        status_code=422,
        detail="Invalid status. Allowed values: todo, in-progress, done",
    )


async def get_user_completion_rate(user_id: Optional[int], db: AsyncSession) -> float:
    if not user_id:
        return 0.5

    result = await db.execute(
        select(
            func.count(Task.id).label("total"),
            func.sum(case((Task.status == "done", 1), else_=0)).label("done"),
        ).where(Task.assignee_id == user_id)
    )
    row = result.first()
    total = int(getattr(row, "total", 0) or 0)
    done = int(getattr(row, "done", 0) or 0)
    if total == 0:
        return 0.5
    return round(done / total, 3)


async def _compute_task_priority(task: Task, db: AsyncSession) -> dict:
    completion_rate = await get_user_completion_rate(task.assignee_id, db)
    invalidate_cache(str(task.id))
    return await compute_priority_score(
        {
            "id": task.id,
            "title": task.title,
            "deadline_days": task.deadline_days,
            "effort": task.effort,
            "impact": task.impact,
            "workload": task.workload,
            "complaint_boost": task.complaint_boost or 0.0,
            "status": task.status,
            "manual_priority_boost": task.manual_priority_boost or 0.0,
            "is_pinned": bool(task.is_pinned),
            "user_completion_rate": completion_rate,
        }
    )


async def enrich_task(task: Task, db: AsyncSession) -> dict:
    """Convert Task ORM object to TaskResponse-compatible dict."""
    assignee_name = None
    if task.assignee_id:
        result = await db.execute(select(User).filter(User.id == task.assignee_id))
        user = result.scalars().first()
        assignee_name = user.name if user else None

    deadline = None
    if task.created_at and getattr(task, "deadline_days", None):
        deadline = task.created_at + timedelta(days=task.deadline_days)

    task_dict = {
        **task.__dict__,
        "assignee_name": assignee_name,
        "deadline": deadline,
        "manual_priority_boost": float(task.manual_priority_boost or 0.0),
        "is_pinned": bool(task.is_pinned),
    }
    task_dict.pop("_sa_instance_state", None)
    return task_dict


def _assert_admin(current_user: User) -> None:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")


# ENDPOINT 1: POST /tasks - Create task + trigger AI scoring
@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)
    _assert_admin(current_user)

    res = await db.execute(select(Task).order_by(Task.task_id.desc()).limit(1))
    last_task = res.scalars().first()
    new_task_id = (last_task.task_id + 1) if last_task else 1

    payload_dict = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    baseline_score = 50.0
    task = Task(
        **payload_dict,
        task_id=new_task_id,
        status="todo",
        complaint_boost=0.0,
        manual_priority_boost=0.0,
        is_pinned=False,
        priority_score=baseline_score,
        priority_label=_label_for_score(baseline_score),
        ai_reasoning="Score unavailable",
    )
    db.add(task)
    await db.flush()  # get task.id before commit

    ai_result = await _compute_task_priority(task, db)
    score = float(ai_result.get("score", baseline_score))
    reasoning = ai_result.get("reasoning", "Score unavailable")
    task.priority_score = score
    task.priority_label = _label_for_score(score)
    task.ai_reasoning = reasoning
    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    _clear_sequence_cache()

    await db.commit()
    await db.refresh(task)
    return await enrich_task(task, db)


# ENDPOINT 2: GET /tasks - All tasks sorted by priority_score DESC
@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    user_id: Optional[int] = None,
    limit: int = 300,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    from sqlalchemy.orm import joinedload

    await db.execute(text("SET LOCAL statement_timeout = '15000ms'"))
    safe_limit = max(1, min(limit, 1000))
    admin_user = is_admin_user(current_user)
    scoped_user_ids: list[int]

    if admin_user:
        if user_id is not None:
            scoped_user_ids = [int(user_id)]
        elif current_user.company_name:
            users_result = await db.execute(select(User.id).where(User.company_name == current_user.company_name).limit(4000))
            scoped_user_ids = [int(uid) for uid in users_result.scalars().all()]
            if not scoped_user_ids and settings.ENVIRONMENT.lower() == "development":
                legacy_result = await db.execute(select(User.id).where(User.company_name.is_(None)).limit(4000))
                scoped_user_ids = [int(uid) for uid in legacy_result.scalars().all()]
        else:
            users_result = await db.execute(
                select(User.id).where((User.id == current_user.id) | (User.created_by_id == current_user.id)).limit(4000)
            )
            scoped_user_ids = [int(uid) for uid in users_result.scalars().all()]
    else:
        scoped_user_ids = [int(current_user.id)]

    if not scoped_user_ids:
        return []

    recent_scan_limit = max(TASK_RECENT_SCAN_WINDOW, safe_limit * 20)
    recent_ids = (
        select(Task.id.label("id"))
        .order_by(Task.id.desc())
        .limit(recent_scan_limit)
        .subquery("recent_task_ids")
    )

    query = (
        select(Task)
        .options(joinedload(Task.assignee))
        .join(recent_ids, Task.id == recent_ids.c.id)
        .where(Task.assignee_id.in_(scoped_user_ids))
        .order_by(Task.id.desc())
        .limit(safe_limit)
    )

    result = await db.execute(query)
    tasks = result.scalars().all()

    if not tasks:
        return []

    output = []
    for t in tasks:
        deadline = None
        if t.created_at and getattr(t, "deadline_days", None):
            deadline = t.created_at + timedelta(days=t.deadline_days)
            
        # Dynamically normalize status (safeguard against legacy seeded DB values)
        raw_status = str(t.status or "todo").lower().strip()
        safe_status = "todo"
        if "done" in raw_status or "completed" in raw_status:
            safe_status = "done"
        elif "progress" in raw_status or "doing" in raw_status or "ongoing" in raw_status:
            safe_status = "in-progress"

        # Dynamically normalize any raw model values from the DB seed
        dynamic_score = float(t.priority_score)
        if dynamic_score <= 40.0:
            dynamic_score = ((dynamic_score - (-5.0)) / 45.0) * 100.0
            
        # Tie to strict empirical percentiles for a 25/25/50% perfect split across thousands of tasks
        if dynamic_score >= 22.5:
            dynamic_label = "High"
        elif dynamic_score >= 17.9:
            dynamic_label = "Medium"
        else:
            dynamic_label = "Low"

        output.append(
            {
                "id": t.id,
                "task_id": t.task_id,
                "title": t.title,
                "description": t.description,
                "assignee_id": t.assignee_id,
                "assignee_name": t.assignee.name if t.assignee else None,
                "deadline_days": t.deadline_days,
                "deadline": deadline,
                "effort": t.effort,
                "impact": t.impact,
                "workload": getattr(t, "workload", 5),
                "status": safe_status,
                "priority_score": dynamic_score,
                "priority_label": dynamic_label,
                "complaint_boost": t.complaint_boost,
                "manual_priority_boost": float(t.manual_priority_boost or 0.0),
                "is_pinned": bool(t.is_pinned),
                "ai_reasoning": t.ai_reasoning,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            }
        )
    return output


# ENDPOINT 3: PATCH /tasks/{id} - Update fields + always re-trigger AI scoring
@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    res = await db.execute(select(Task).filter(Task.id == task_id))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    admin_user = is_admin_user(current_user)
    if not admin_user and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own tasks")

    update_data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)

    if not admin_user:
        allowed_employee_fields = {
            "status",
            "title",
            "description",
            "deadline_days",
            "effort",
            "impact",
            "workload",
        }
        disallowed_fields = set(update_data.keys()) - allowed_employee_fields
        if disallowed_fields:
            raise HTTPException(
                status_code=403,
                detail="You cannot edit assignment or admin override fields",
            )

    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = normalize_task_status(update_data["status"], default=task.status or "todo")

    if "manual_priority_boost" in update_data and update_data["manual_priority_boost"] is not None:
        update_data["manual_priority_boost"] = max(0.0, min(30.0, float(update_data["manual_priority_boost"])))

    for field, value in update_data.items():
        setattr(task, field, value)

    # Always rescore - real-time dynamic prioritization.
    ai_result = await _compute_task_priority(task, db)
    score = float(ai_result.get("score", task.priority_score or 50.0))
    reasoning = ai_result.get("reasoning", task.ai_reasoning or "Score unavailable")
    task.priority_score = score
    task.priority_label = _label_for_score(score)
    task.ai_reasoning = reasoning
    invalidate_cache(str(task.id))

    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    _clear_sequence_cache()
    await db.commit()
    await db.refresh(task)
    return await enrich_task(task, db)


# ENDPOINT 3.1: POST /tasks/{id}/override - Admin manual priority override
@router.post("/{task_id}/override", response_model=TaskResponse)
async def override_task_priority(
    task_id: int,
    payload: TaskPriorityOverride,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)
    _assert_admin(current_user)

    res = await db.execute(select(Task).where(Task.id == task_id))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.manual_priority_boost = float(payload.manual_priority_boost or 0.0)
    task.is_pinned = bool(payload.is_pinned)

    if payload.override_reason:
        reason = str(payload.override_reason).strip()
        if reason:
            existing = task.ai_reasoning or "Score unavailable"
            task.ai_reasoning = f"Admin override: {reason} | {existing}"

    ai_result = await _compute_task_priority(task, db)
    score = float(ai_result.get("score", task.priority_score or 50.0))
    reasoning = ai_result.get("reasoning", task.ai_reasoning or "Score unavailable")
    task.priority_score = score
    task.priority_label = _label_for_score(score)
    task.ai_reasoning = reasoning
    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    invalidate_cache(str(task.id))
    _clear_sequence_cache()

    await db.commit()
    await db.refresh(task)
    return await enrich_task(task, db)


# ENDPOINT 4: DELETE /tasks/{id}
@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)
    _assert_admin(current_user)

    res = await db.execute(select(Task).filter(Task.id == task_id))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    _clear_sequence_cache()
    await db.commit()
    return None


# ENDPOINT 5: GET /tasks/my/{user_id} - Personal filtered view
@router.get("/my/{user_id}", response_model=List[TaskResponse])
async def get_my_tasks(
    user_id: int,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)
    if not is_admin_user(current_user) and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own task list")

    from sqlalchemy.orm import joinedload

    await db.execute(text("SET LOCAL statement_timeout = '12000ms'"))
    safe_limit = max(1, min(limit, 400))
    query = (
        select(Task)
        .options(joinedload(Task.assignee))
        .filter(Task.assignee_id == user_id)
        .order_by(Task.id.desc())
        .limit(safe_limit)
    )
    result = await db.execute(query)
    tasks = result.scalars().all()
    if not tasks:
        return []
    output = []
    for t in tasks:
        deadline = None
        if t.created_at and getattr(t, "deadline_days", None):
            deadline = t.created_at + timedelta(days=t.deadline_days)
            
        # Dynamically normalize status (safeguard against legacy seeded DB values)
        raw_status = str(t.status or "todo").lower().strip()
        safe_status = "todo"
        if "done" in raw_status or "completed" in raw_status:
            safe_status = "done"
        elif "progress" in raw_status or "doing" in raw_status or "ongoing" in raw_status:
            safe_status = "in-progress"

        # Dynamically normalize any raw model values from the DB seed
        dynamic_score = float(t.priority_score)
        if dynamic_score <= 40.0:
            dynamic_score = ((dynamic_score - (-5.0)) / 45.0) * 100.0
            
        # Tie to strict empirical percentiles for a 25/25/50% perfect split across thousands of tasks
        if dynamic_score >= 22.5:
            dynamic_label = "High"
        elif dynamic_score >= 17.9:
            dynamic_label = "Medium"
        else:
            dynamic_label = "Low"

        output.append({
            "id": t.id,
            "task_id": t.task_id,
            "title": t.title,
            "description": t.description,
            "assignee_id": t.assignee_id,
            "assignee_name": t.assignee.name if t.assignee else None,
            "deadline_days": t.deadline_days,
            "deadline": deadline,
            "effort": t.effort,
            "impact": t.impact,
            "workload": getattr(t, "workload", 5),
            "status": safe_status,
            "priority_score": dynamic_score,
            "priority_label": dynamic_label,
            "complaint_boost": t.complaint_boost,
            "manual_priority_boost": float(t.manual_priority_boost or 0.0),
            "is_pinned": bool(t.is_pinned),
            "ai_reasoning": t.ai_reasoning,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
        })
    return output


# BONUS: GET /tasks/score/{id} - Utility endpoint for P2/P3 testing
@router.get("/score/{task_id}")
async def get_task_score(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    res = await db.execute(select(Task).filter(Task.id == task_id))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not is_admin_user(current_user) and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only score your own tasks")

    ai_result = await _compute_task_priority(task, db)
    score = ai_result.get("score", 50.0)
    reasoning = ai_result.get("reasoning", "Score unavailable")
    return {
        "task_id": task_id,
        "current_score": task.priority_score,
        "recomputed_score": score,
        "reasoning": reasoning,
    }


# PHASE 3: GET /tasks/sequence/{user_id} - AI execution order
@router.get("/sequence/{user_id}", response_model=List[TaskSequenceItem])
async def get_task_sequence(
    user_id: int,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)
    admin_user = is_admin_user(current_user)
    if not admin_user and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own task sequence")

    await db.execute(text("SET LOCAL statement_timeout = '12000ms'"))
    safe_limit = max(1, min(limit, 400))

    cache_key = _sequence_cache_key(user_id, current_user, safe_limit)
    cached = _get_cached_sequence(cache_key)
    if cached is not None:
        return cached

    query = (
        select(Task)
        .filter(Task.assignee_id == user_id, Task.status != "done")
        .order_by(Task.id.desc())
        .limit(safe_limit)
    )
    result = await db.execute(query)
    tasks = result.scalars().all()

    if admin_user and not tasks:
        scoped_user_ids: list[int] = []
        if current_user.company_name:
            users_result = await db.execute(select(User.id).where(User.company_name == current_user.company_name).limit(4000))
            scoped_user_ids = [int(uid) for uid in users_result.scalars().all()]
            if not scoped_user_ids and settings.ENVIRONMENT.lower() == "development":
                legacy_result = await db.execute(select(User.id).where(User.company_name.is_(None)).limit(4000))
                scoped_user_ids = [int(uid) for uid in legacy_result.scalars().all()]
        else:
            users_result = await db.execute(
                select(User.id).where((User.id == current_user.id) | (User.created_by_id == current_user.id)).limit(4000)
            )
            scoped_user_ids = [int(uid) for uid in users_result.scalars().all()]

        if scoped_user_ids:
            scoped_query = (
                select(Task)
                .filter(Task.assignee_id.in_(scoped_user_ids), Task.status != "done")
                .order_by(Task.id.desc())
                .limit(safe_limit)
            )
            scoped_result = await db.execute(scoped_query)
            tasks = scoped_result.scalars().all()

    if not tasks:
        _set_cached_sequence(cache_key, [])
        return []

    task_dicts = []
    for t in tasks:
        task_dicts.append(
            {
                "id": t.id,
                "title": t.title,
                "priority_score": t.priority_score,
                "deadline": str(t.created_at + timedelta(days=t.deadline_days)) if t.created_at else None,
                "effort": t.effort,
                "impact": t.impact,
                "status": t.status,
            }
        )

    sequence = await suggest_execution_order(task_dicts)
    sequence = sequence[:safe_limit]
    _set_cached_sequence(cache_key, sequence)
    return sequence
