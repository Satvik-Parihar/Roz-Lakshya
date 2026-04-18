from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
from sqlalchemy import select
import asyncio

from app.database import AsyncSessionLocal
from app.models import Task
from app.services.ai_engine import compute_priority_score

scheduler = AsyncIOScheduler()

async def rescore_all_tasks():
    """
    Phase 3: background re-score on deadline changes.
    Runs every 15 minutes.
    """
    print(f"[Scheduler] Starting re-score job at {datetime.now()}")
    async with AsyncSessionLocal() as db:
        stmt = select(Task).filter(Task.status != "done")
        res = await db.execute(stmt)
        tasks = res.scalars().all()
        
        for task in tasks:
            try:
                task_data = {
                    "title": task.title,
                    "deadline": str(task.created_at) if task.created_at else None,
                    "effort": task.effort,
                    "impact": task.impact,
                    "complaint_boost": task.complaint_boost,
                    "status": task.status
                }
                ai_res = await compute_priority_score(task_data)
                task.priority_score = ai_res.get("score", task.priority_score)
                task.ai_reasoning = ai_res.get("reasoning", task.ai_reasoning)
            except Exception as e:
                print(f"[Scheduler] Error re-scoring task {task.id}: {e}")
                
        await db.commit()
    print(f"[Scheduler] Finished re-score job.")

async def check_sla_breaches():
    """Phase 6/Bonus: Placeholder for real-time alerts."""
    print(f"[Scheduler] SLA check ran at {datetime.now()}")

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(rescore_all_tasks, 'interval', minutes=15, id='rescore_tasks')
        scheduler.add_job(check_sla_breaches, 'interval', minutes=15, id='check_sla')
        scheduler.start()
        print("[Scheduler] AsyncIOScheduler started.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
