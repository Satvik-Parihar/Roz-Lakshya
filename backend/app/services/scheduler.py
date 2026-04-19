import asyncio
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import case, func
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Alert, Complaint, Task
from app.services.ai_engine import compute_priority_score, invalidate_cache

scheduler = AsyncIOScheduler()


def _label_for_score(score: float) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


async def get_user_completion_rate_sync(user_id: int | None, db) -> float:
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

        user_rates: dict[int, float] = {}
        for task in tasks:
            if task.assignee_id and task.assignee_id not in user_rates:
                user_rates[task.assignee_id] = await get_user_completion_rate_sync(task.assignee_id, db)
        
        for index, task in enumerate(tasks, start=1):
            try:
                invalidate_cache(str(task.id))
                task_data = {
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
                    "user_completion_rate": user_rates.get(task.assignee_id, 0.5),
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


def _derive_task_deadline(task: Task):
    if task.created_at and getattr(task, "deadline_days", None):
        return task.created_at + timedelta(days=task.deadline_days)
    return None


async def check_task_deadlines():
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Task).where(Task.status != "done"))
            tasks = result.scalars().all()
            now = datetime.utcnow()
            due_soon_cutoff = now + timedelta(hours=2)
            alerts_created = 0
            tasks_updated = 0

            for index, task in enumerate(tasks, start=1):
                deadline = _derive_task_deadline(task)

                if deadline:
                    if deadline < now:
                        existing_overdue = await session.execute(
                            select(Alert).where(
                                Alert.task_id == task.id,
                                Alert.type == "task_overdue",
                                Alert.is_read.is_(False),
                            )
                        )
                        if existing_overdue.scalars().first() is None:
                            session.add(
                                Alert(
                                    type="task_overdue",
                                    message=f"OVERDUE: '{task.title}' was due {deadline}",
                                    task_id=task.id,
                                    is_read=False,
                                )
                            )
                            alerts_created += 1
                    elif now <= deadline <= due_soon_cutoff:
                        existing_due_soon = await session.execute(
                            select(Alert).where(
                                Alert.task_id == task.id,
                                Alert.type == "task_due_soon",
                                Alert.is_read.is_(False),
                            )
                        )
                        if existing_due_soon.scalars().first() is None:
                            session.add(
                                Alert(
                                    type="task_due_soon",
                                    message=f"DUE SOON: '{task.title}' is due at {deadline}",
                                    task_id=task.id,
                                    is_read=False,
                                )
                            )
                            alerts_created += 1

                user_rate = await get_user_completion_rate_sync(task.assignee_id, session)
                invalidate_cache(str(task.id))
                ai_result = await compute_priority_score(
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
                        "user_completion_rate": user_rate,
                    }
                )

                existing_score = float(task.priority_score or 0.0)
                next_score = float(ai_result.get("score", existing_score))
                next_label = _label_for_score(next_score)
                next_reasoning = ai_result.get("reasoning", task.ai_reasoning)

                has_score_change = task.priority_score is None or abs(next_score - existing_score) > 1e-6
                has_label_change = task.priority_label != next_label
                has_reasoning_change = (task.ai_reasoning or "") != (next_reasoning or "")

                if has_score_change or has_label_change or has_reasoning_change:
                    task.priority_score = next_score
                    task.priority_label = next_label
                    task.ai_reasoning = next_reasoning
                    task.updated_at = datetime.utcnow()
                    tasks_updated += 1

                if index % 200 == 0:
                    await session.flush()
                    await asyncio.sleep(0)

            if alerts_created or tasks_updated:
                await session.commit()
    except Exception as exc:
        print(f"[Scheduler] check_task_deadlines failed: {exc}")

async def check_sla_breaches():
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Complaint).where(
                    Complaint.status != "resolved",
                    Complaint.sla_deadline.is_not(None),
                )
            )
            complaints = result.scalars().all()
            now = datetime.utcnow()
            alerts_created = 0

            for complaint in complaints:
                if complaint.sla_deadline and complaint.sla_deadline < now:
                    existing_sla = await session.execute(
                        select(Alert).where(
                            Alert.complaint_id == complaint.id,
                            Alert.type == "sla_breach",
                            Alert.is_read.is_(False),
                        )
                    )
                    if existing_sla.scalars().first() is None:
                        session.add(
                            Alert(
                                type="sla_breach",
                                message=(
                                    f"SLA BREACH: Complaint #{complaint.id} "
                                    f"({complaint.category}) exceeded {complaint.sla_hours}h SLA"
                                ),
                                complaint_id=complaint.id,
                                is_read=False,
                            )
                        )
                        alerts_created += 1

            if alerts_created:
                await session.commit()
    except Exception as exc:
        print(f"[Scheduler] check_sla_breaches failed: {exc}")

def start_scheduler():
    if scheduler.running:
        return

    scheduler.add_job(
        check_task_deadlines,
        "interval",
        minutes=15,
        id="deadline_check",
        replace_existing=True,
        next_run_time=datetime.now() + timedelta(minutes=2),
        max_instances=1,
        coalesce=True,
        misfire_grace_time=120,
    )
    scheduler.add_job(
        check_sla_breaches,
        "interval",
        minutes=15,
        id="sla_check",
        replace_existing=True,
        next_run_time=datetime.now() + timedelta(minutes=2),
        max_instances=1,
        coalesce=True,
        misfire_grace_time=120,
    )
    scheduler.add_job(
        rescore_all_tasks,
        "interval",
        minutes=60,
        id="rescore_tasks",
        replace_existing=True,
        next_run_time=datetime.now() + timedelta(minutes=10),
        max_instances=1,
        coalesce=True,
        misfire_grace_time=120,
    )
    scheduler.start()
    print("[Scheduler] AsyncIOScheduler started.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
