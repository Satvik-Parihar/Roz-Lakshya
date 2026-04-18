from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task
from app.services.ai_engine import compute_priority_score, invalidate_cache

router = APIRouter(prefix="/tasks", tags=["scoring"])

@router.get("/score/{task_id}")
def score_task(task_id: int, db: Session = Depends(get_db)):
    """
    Force-score a single task and return score + reasoning.
    Useful for testing AI engine in isolation.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Bust cache so this always calls Claude fresh
    invalidate_cache(str(task_id))
    result = compute_priority_score(task)

    return {
        "task_id": task_id,
        "title": task.title,
        "score": result["score"],
        "reasoning": result["reasoning"],
    }

@router.delete("/score/cache/{task_id}")
def bust_score_cache(task_id: int):
    """Manually invalidate cache for a task — useful for testing."""
    invalidate_cache(str(task_id))
    return {"message": f"Cache cleared for task {task_id}"}
