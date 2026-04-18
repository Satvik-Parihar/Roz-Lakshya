from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models import Task, User
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskSequenceItem
from typing import Optional, List
import asyncio

# Safe import of AI engine — fallback if P2 not ready
try:
    from app.services.ai_engine import compute_priority_score, suggest_execution_order
except ImportError:
    def compute_priority_score(task):
        return {"score": 50.0, "reasoning": "AI engine not yet available"}
    async def suggest_execution_order(tasks):
        return []

router = APIRouter(prefix="/tasks", tags=["Tasks"], redirect_slashes=False)

def get_priority_label(score: float) -> str:
    if score > 75:
        return "High"
    elif score >= 50:
        return "Medium"
    else:
        return "Low"

async def enrich_task(task: Task, db: AsyncSession) -> dict:
    """Convert Task ORM object to TaskResponse-compatible dict"""
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
    }
    task_dict.pop("_sa_instance_state", None)
    return task_dict


# ENDPOINT 1: POST /tasks — Create task + trigger AI scoring
@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Task).order_by(Task.task_id.desc()).limit(1))
    last_task = res.scalars().first()
    new_task_id = (last_task.task_id + 1) if last_task else 1

    payload_dict = payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()
    task = Task(**payload_dict, task_id=new_task_id, status="todo", complaint_boost=0.0)
    db.add(task)
    await db.flush()  # get task.id before commit

    ai_result = compute_priority_score(task)
    score = ai_result.get("score", 50.0)
    reasoning = ai_result.get("reasoning", "Score unavailable")
    task.priority_score = score
    task.priority_label = get_priority_label(score)
    task.ai_reasoning = reasoning
    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    await db.commit()
    await db.refresh(task)
    return await enrich_task(task, db)


# ENDPOINT 2: GET /tasks — All tasks sorted by priority_score DESC
@router.get("/", response_model=List[TaskResponse])
async def get_tasks(user_id: Optional[int] = None, limit: int = 100, db: AsyncSession = Depends(get_db)):
    # Use a join to avoid N+1 queries for assignee names
    # Note: We keep TaskResponse structure by mapping the result
    from sqlalchemy.orm import joinedload
    
    query = select(Task).options(joinedload(Task.assignee))
    if user_id:
        query = query.filter(Task.assignee_id == user_id)
    
    # Apply limit to prevent hanging with 50,000 tasks
    query = query.order_by(Task.priority_score.desc()).limit(limit)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    if not tasks:
        return []

    # Map to schemas manually since we used joinedload
    output = []
    for t in tasks:
        deadline = None
        if t.created_at and getattr(t, "deadline_days", None):
            deadline = t.created_at + timedelta(days=t.deadline_days)
            
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
            "status": t.status,
            "priority_score": t.priority_score,
            "priority_label": t.priority_label,
            "complaint_boost": t.complaint_boost,
            "ai_reasoning": t.ai_reasoning,
            "created_at": t.created_at,
            "updated_at": t.updated_at
        })
    return output


# ENDPOINT 3: PATCH /tasks/{id} — Update fields + re-trigger AI scoring
@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, payload: TaskUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Task).filter(Task.id == task_id))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True) if hasattr(payload, 'model_dump') else payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    scoring_fields = {"deadline_days", "effort", "impact", "workload"}
    if scoring_fields.intersection(update_data.keys()):
        ai_result = compute_priority_score(task)
        score = ai_result.get("score", 50.0)
        reasoning = ai_result.get("reasoning", "Score unavailable")
        task.priority_score = score
        task.priority_label = get_priority_label(score)
        task.ai_reasoning = reasoning

    task.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    await db.refresh(task)
    return await enrich_task(task, db)


# ENDPOINT 4: DELETE /tasks/{id}
@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Task).filter(Task.id == task_id))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return None


# ENDPOINT 5: GET /tasks/my/{user_id} — Personal filtered view
@router.get("/my/{user_id}", response_model=List[TaskResponse])
async def get_my_tasks(user_id: int, db: AsyncSession = Depends(get_db)):
    query = select(Task).filter(Task.assignee_id == user_id).order_by(Task.priority_score.desc())
    result = await db.execute(query)
    tasks = result.scalars().all()
    if not tasks:
        return []
    return await asyncio.gather(*(enrich_task(t, db) for t in tasks))


# BONUS: GET /tasks/score/{id} — Utility endpoint for P2/P3 testing
@router.get("/score/{task_id}")
async def get_task_score(task_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Task).filter(Task.id == task_id))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    ai_result = compute_priority_score(task)
    score = ai_result.get("score", 50.0)
    reasoning = ai_result.get("reasoning", "Score unavailable")
    return {
        "task_id": task_id,
        "current_score": task.priority_score,
        "recomputed_score": score,
        "reasoning": reasoning
    }

# PHASE 3: GET /tasks/sequence/{user_id} — AI execution order
@router.get("/sequence/{user_id}", response_model=List[TaskSequenceItem])
async def get_task_sequence(user_id: int, db: AsyncSession = Depends(get_db)):
    # Fetch all non-done tasks for this user
    query = select(Task).filter(Task.assignee_id == user_id, Task.status != "done")
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    if not tasks:
        return []
        
    # Convert tasks to simple dicts for AI
    task_dicts = []
    for t in tasks:
        task_dicts.append({
            "id": t.id,
            "title": t.title,
            "priority_score": t.priority_score,
            "deadline": str(t.created_at + timedelta(days=t.deadline_days)) if t.created_at else None,
            "effort": t.effort,
            "impact": t.impact,
            "status": t.status
        })
        
    return await suggest_execution_order(task_dicts)
