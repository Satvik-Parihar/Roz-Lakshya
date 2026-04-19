import asyncio
import os
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import Task
from app.services.ai_engine import compute_priority_score
from app.routers.tasks import _label_for_score

async def main():
    async with AsyncSessionLocal() as db:
        tasks_result = await db.execute(select(Task))
        tasks = tasks_result.scalars().all()
        
        updated_count = 0
        for task in tasks:
            # Normalize status
            # E.g. 'In Progress' -> 'in_progress', 'To Do' -> 'todo'
            st = str(task.status or "todo").lower().strip()
            if "done" in st or "completed" in st:
                task.status = "done"
            elif "progress" in st or "doing" in st or "ongoing" in st:
                task.status = "in-progress" # Frontend expects 'in-progress' logic from normalizeStatus() matching DB 'in-progress' or 'in_progress'
            else:
                task.status = "todo"
                
            # For the DB side, 'in-progress' vs 'in_progress' is fine, but the frontend replaces _ with - anyway.
            # Let's save it as 'in-progress' to be extremely safe against the filter.
            if task.status == "in_progress":
                task.status = "in-progress"
            
            # Form dictionary for the AI engine
            tdict = {
                "id": task.id,
                "status": task.status,
                "deadline_days": task.deadline_days,
                "deadline": None,
                "effort": task.effort,
                "impact": task.impact,
                "workload": task.workload,
                "complaint_boost": float(task.complaint_boost or 0.0),
                "manual_priority_boost": float(task.manual_priority_boost or 0.0),
                "is_pinned": bool(task.is_pinned),
            }
            
            ai_data = await compute_priority_score(tdict)
            prev_label = task.priority_label
            task.priority_score = float(ai_data.get("score", 50.0))
            task.priority_label = _label_for_score(task.priority_score)
            task.ai_reasoning = ai_data.get("reasoning", "Score unavailable")
            print(f"Task {task.id}: {prev_label} -> {task.priority_label} ({task.priority_score:.1f})")
            updated_count += 1
            
        await db.commit()
        print(f"Re-scored and normalized {updated_count} tasks.")

if __name__ == "__main__":
    asyncio.run(main())
