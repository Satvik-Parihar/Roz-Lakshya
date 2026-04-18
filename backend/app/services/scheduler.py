from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from sqlalchemy import select
import asyncio

from app.database import AsyncSessionLocal
from app.models import Task
from app.services.ai_engine import compute_priority_score

scheduler = AsyncIOScheduler()


def _label_for_score(score: float) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"

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
        total = len(tasks)
        print(f"[Scheduler] Re-scoring {total} active tasks")
        
        for index, task in enumerate(tasks, start=1):
            try:
                task_data = {
                    "id": task.id,
                    "title": task.title,
                    "deadline_days": task.deadline_days,
                    "effort": task.effort,
                    "impact": task.impact,
                    "workload": task.workload,
                    "complaint_boost": task.complaint_boost,
                    "status": task.status
                }
                ai_res = await compute_priority_score(task_data)
                task.priority_score = ai_res.get("score", task.priority_score)
                task.priority_label = _label_for_score(float(task.priority_score or 0))
                task.ai_reasoning = ai_res.get("reasoning", task.ai_reasoning)
            except Exception as e:
                print(f"[Scheduler] Error re-scoring task {task.id}: {e}")

            # Yield periodically so API requests are not starved while rescoring large datasets.
            if index % 200 == 0:
                await db.flush()
                await asyncio.sleep(0)
                
        await db.commit()
    print(f"[Scheduler] Finished re-score job.")

async def check_sla_breaches():
    """Phase 6/Bonus: Placeholder for real-time alerts."""
    print(f"[Scheduler] SLA check ran at {datetime.now()}")

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            rescore_all_tasks,
            'interval',
            minutes=15,
            id='rescore_tasks',
            next_run_time=datetime.now() + timedelta(minutes=5),
            max_instances=1,
            coalesce=True,
            misfire_grace_time=120,
        )
        scheduler.add_job(
            check_sla_breaches,
            'interval',
            minutes=15,
            id='check_sla',
            max_instances=1,
            coalesce=True,
            misfire_grace_time=120,
        )
        scheduler.start()
        print("[Scheduler] AsyncIOScheduler started.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
