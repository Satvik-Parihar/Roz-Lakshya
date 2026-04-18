from datetime import datetime, timedelta
import inspect

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import Task, Complaint, Alert
from app.services.ai_engine import compute_priority_score


scheduler = AsyncIOScheduler()


def _derive_task_deadline(task: Task):
    if task.created_at and getattr(task, "deadline_days", None):
        return task.created_at + timedelta(days=task.deadline_days)
    return None


async def _compute_task_priority(task: Task, deadline: datetime | None) -> dict:
    task_data = {
        "title": task.title,
        "deadline": deadline.isoformat() if deadline else None,
        "effort": task.effort,
        "impact": task.impact,
        "complaint_boost": task.complaint_boost,
        "status": task.status,
    }

    try:
        maybe_result = compute_priority_score(task_data)
        if inspect.isawaitable(maybe_result):
            return await maybe_result
        return maybe_result
    except Exception:
        maybe_result = compute_priority_score(task)
        if inspect.isawaitable(maybe_result):
            return await maybe_result
        return maybe_result


async def check_task_deadlines():
    try:
        async with AsyncSessionLocal() as session:
            session: AsyncSession
            result = await session.execute(select(Task).where(Task.status != "done"))
            tasks = result.scalars().all()
            now = datetime.utcnow()
            due_soon_cutoff = now + timedelta(hours=2)

            for task in tasks:
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

                score_result = await _compute_task_priority(task, deadline)
                task.priority_score = float(score_result.get("score", task.priority_score or 0.0))
                task.ai_reasoning = score_result.get("reasoning", task.ai_reasoning)
                task.updated_at = datetime.utcnow()

            await session.commit()
    except Exception as exc:
        print(f"[Scheduler] check_task_deadlines failed: {exc}")


async def check_sla_breaches():
    try:
        async with AsyncSessionLocal() as session:
            session: AsyncSession
            result = await session.execute(
                select(Complaint).where(
                    Complaint.status != "resolved",
                    Complaint.sla_deadline.is_not(None),
                )
            )
            complaints = result.scalars().all()
            now = datetime.utcnow()

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

            await session.commit()
    except Exception as exc:
        print(f"[Scheduler] check_sla_breaches failed: {exc}")


def start_scheduler():
    scheduler.add_job(
        check_task_deadlines,
        "interval",
        minutes=15,
        id="deadline_check",
        replace_existing=True,
        next_run_time=datetime.utcnow(),
    )
    scheduler.add_job(
        check_sla_breaches,
        "interval",
        minutes=15,
        id="sla_check",
        replace_existing=True,
    )
    if not scheduler.running:
        scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
