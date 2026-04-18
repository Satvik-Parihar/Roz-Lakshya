from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Complaint, Task
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

@router.post("/", response_model=ComplaintResponse)
async def create_complaint(payload: ComplaintCreate, db: AsyncSession = Depends(get_db)):
    # 1. Fetch available tasks for AI matching
    stmt = select(Task.id, Task.title).filter(Task.status != "done")
    res = await db.execute(stmt)
    available_tasks = [{"id": r.id, "title": r.title} for r in res.all()]

    # 2. AI Classification
    ai_result = await classify_complaint(payload.text, payload.channel, available_tasks)

    # 3. Create Complaint
    new_complaint = Complaint(
        text=payload.text,
        channel=payload.channel,
        category=ai_result.get("category"),
        priority=ai_result.get("priority"),
        urgency_score=ai_result.get("urgency_score", 0.0),
        resolution_steps=ai_result.get("resolution_steps"),
        linked_task_id=ai_result.get("linked_task_id"),
        sla_hours=ai_result.get("sla_hours", 24),
        status="open"
    )
    db.add(new_complaint)
    await db.flush()

    # 4. Phase 4 Bridge: If linked to a task, boost priority
    if new_complaint.linked_task_id:
        task_stmt = select(Task).filter(Task.id == new_complaint.linked_task_id)
        task_res = await db.execute(task_stmt)
        task = task_res.scalars().first()
        
        if task:
            # Boost = urgency_score * 0.3
            boost_amt = ai_result.get("urgency_score", 0.0) * 0.3
            task.complaint_boost += boost_amt
            
            # Re-score task
            task_data = {
                "title": task.title,
                "deadline": str(task.created_at) if task.created_at else None,
                "effort": task.effort,
                "impact": task.impact,
                "complaint_boost": task.complaint_boost,
                "status": task.status
            }
            new_ai_res = await compute_priority_score(task_data)
            task.priority_score = new_ai_res.get("score", 50.0)
            task.ai_reasoning = new_ai_res.get("reasoning", task.ai_reasoning)

    await db.commit()
    await db.refresh(new_complaint)
    return new_complaint

@router.get("/", response_model=List[ComplaintResponse])
async def list_complaints(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    stmt = select(Complaint).offset(skip).limit(limit).order_by(Complaint.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/{id}/status", response_model=ComplaintResponse)
async def update_complaint_status(id: int, payload: ComplaintUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Complaint).filter(Complaint.id == id)
    res = await db.execute(stmt)
    complaint = res.scalars().first()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    complaint.status = payload.status
    await db.commit()
    await db.refresh(complaint)
    return complaint
