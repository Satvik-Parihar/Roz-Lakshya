import json
import os
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import and_, case, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import Complaint, Task, User
from app.security import ensure_password_reset_completed, get_current_user, is_admin_user

try:
    from groq import Groq
except Exception:
    Groq = None

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)

MAX_TASK_WINDOW = 500
ACTIVE_STATUSES = ["todo", "in-progress", "in_progress"]


def _dept_from_user(role: str | None, is_admin: bool) -> str:
    if is_admin:
        return "Admin"
    normalized = str(role or "team_member").replace("_", " ").strip().title()
    return normalized or "Team Member"


def _heuristic_operational_notes(metrics: dict) -> dict:
    overdue = int(metrics.get("overdue", 0) or 0)
    high_priority_active = int(metrics.get("high_priority_active", 0) or 0)
    in_progress = int(metrics.get("in_progress", 0) or 0)
    completed_today = int(metrics.get("completed_today", 0) or 0)
    total_tasks = int(metrics.get("total_tasks", 0) or 0)

    if overdue > 0:
        high_risk_window = (
            f"{overdue} tasks are overdue in the latest {MAX_TASK_WINDOW}-task window. "
            "Prioritize overdue high-impact tasks first."
        )
    elif high_priority_active > 0:
        high_risk_window = (
            f"{high_priority_active} high-priority tasks are still open. "
            "Keep these at the top of execution sequencing today."
        )
    else:
        high_risk_window = "No immediate risk spikes detected. Continue monitoring deadlines and complaint-linked tasks."

    if total_tasks == 0:
        team_throughput = "No tasks found for this company scope yet. Add or assign tasks to start tracking throughput."
    elif completed_today == 0 and in_progress > 0:
        team_throughput = (
            f"{in_progress} tasks are in progress but none completed today. "
            "Reduce context switching and close oldest in-progress tasks first."
        )
    else:
        completion_ratio = (completed_today / max(total_tasks, 1)) * 100.0
        team_throughput = (
            f"Completed today: {completed_today} out of {total_tasks} tracked tasks "
            f"({completion_ratio:.1f}%). Maintain focus on medium-priority queue aging."
        )

    return {
        "high_risk_window": high_risk_window,
        "team_throughput": team_throughput,
        "source": "heuristic",
    }


def _try_groq_operational_notes(metrics: dict) -> dict | None:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key or Groq is None:
        return None

    try:
        client = Groq(api_key=api_key)
        prompt = {
            "task_window": MAX_TASK_WINDOW,
            "metrics": {
                "total_tasks": int(metrics.get("total_tasks", 0) or 0),
                "completed_today": int(metrics.get("completed_today", 0) or 0),
                "in_progress": int(metrics.get("in_progress", 0) or 0),
                "overdue": int(metrics.get("overdue", 0) or 0),
                "high_priority_active": int(metrics.get("high_priority_active", 0) or 0),
                "open_complaints": int(metrics.get("open_complaints", 0) or 0),
            },
        }

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            temperature=0.2,
            max_tokens=220,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an operations analyst. Return ONLY valid JSON with keys "
                        "high_risk_window and team_throughput. Each value must be one concise sentence."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Create operational notes from this data: {json.dumps(prompt)}",
                },
            ],
        )

        raw = (response.choices[0].message.content or "").strip()
        parsed = json.loads(raw)
        high_risk_window = str(parsed.get("high_risk_window", "")).strip()
        team_throughput = str(parsed.get("team_throughput", "")).strip()
        if not high_risk_window or not team_throughput:
            return None
        return {
            "high_risk_window": high_risk_window,
            "team_throughput": team_throughput,
            "source": "groq",
        }
    except Exception:
        return None


async def _resolve_scope_user_ids(db: AsyncSession, current_user: User) -> tuple[bool, list[int]]:
    admin_user = is_admin_user(current_user)

    if not admin_user:
        return False, [int(current_user.id)]

    if current_user.company_name:
        users_stmt = select(User.id).where(User.company_name == current_user.company_name)
    else:
        users_stmt = select(User.id).where(
            (User.id == current_user.id) | (User.created_by_id == current_user.id)
        )

    users_res = await db.execute(users_stmt.limit(2000))
    user_ids = [int(uid) for uid in users_res.scalars().all()]
    if not user_ids:
        user_ids = [int(current_user.id)]

    return True, user_ids


def _recent_task_ids_subquery(user_ids: list[int]):
    recent_candidates = (
        select(Task.id.label("id"), Task.assignee_id.label("assignee_id"))
        .order_by(Task.id.desc())
        .limit(MAX_TASK_WINDOW * 20)
        .subquery("recent_candidates")
    )

    return (
        select(recent_candidates.c.id.label("id"))
        .where(recent_candidates.c.assignee_id.in_(user_ids))
        .order_by(recent_candidates.c.id.desc())
        .limit(MAX_TASK_WINDOW)
        .subquery("recent_task_ids")
    )


async def _compute_summary(db: AsyncSession, user_ids: list[int], admin_user: bool) -> dict:
    await db.execute(text("SET LOCAL statement_timeout = '15000ms'"))

    recent_ids = _recent_task_ids_subquery(user_ids)
    rt = (
        select(
            Task.id,
            Task.status,
            Task.priority_label,
            Task.priority_score,
            Task.created_at,
            Task.updated_at,
            Task.deadline_days,
        )
        .join(recent_ids, Task.id == recent_ids.c.id)
        .subquery("rt")
    )

    start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    overdue_expr = and_(
        rt.c.status == "todo",
        rt.c.created_at.is_not(None),
        rt.c.deadline_days.is_not(None),
        (func.extract("epoch", func.now() - rt.c.created_at) / 86400.0) > rt.c.deadline_days,
    )

    agg_stmt = select(
        func.count(rt.c.id).label("total_tasks"),
        func.coalesce(
            func.sum(case((and_(rt.c.status == "done", rt.c.updated_at >= start_of_day), 1), else_=0)),
            0,
        ).label("completed_today"),
        func.coalesce(func.sum(case((overdue_expr, 1), else_=0)), 0).label("overdue"),
        func.coalesce(
            func.sum(
                case(
                    (
                        and_(
                            func.lower(func.coalesce(rt.c.priority_label, "")) == "high",
                            rt.c.status != "done",
                        ),
                        1,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("high_priority_active"),
        func.coalesce(func.sum(case((rt.c.status.in_(["in-progress", "in_progress"]), 1), else_=0)), 0).label("in_progress"),
        func.coalesce(
            func.sum(case((and_(rt.c.status == "todo", func.coalesce(rt.c.priority_score, 0) < 20), 1), else_=0)),
            0,
        ).label("on_hold"),
    )
    agg_row = (await db.execute(agg_stmt)).first()

    open_complaints_stmt = select(func.count(Complaint.id)).where(
        Complaint.status == "open",
        Complaint.linked_task_id.in_(select(rt.c.id)),
    )
    open_complaints = int((await db.scalar(open_complaints_stmt)) or 0)

    return {
        "total_tasks": int(getattr(agg_row, "total_tasks", 0) or 0),
        "completed_today": int(getattr(agg_row, "completed_today", 0) or 0),
        "overdue": int(getattr(agg_row, "overdue", 0) or 0),
        "high_priority_active": int(getattr(agg_row, "high_priority_active", 0) or 0),
        "open_complaints": open_complaints,
        "in_progress": int(getattr(agg_row, "in_progress", 0) or 0),
        "on_hold": int(getattr(agg_row, "on_hold", 0) or 0),
        "total_employees": len(user_ids) if admin_user else 1,
    }


@router.get("/summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    try:
        admin_user, user_ids = await _resolve_scope_user_ids(db, current_user)
        return await _compute_summary(db, user_ids, admin_user)
    except Exception:
        return {
            "total_tasks": 0,
            "completed_today": 0,
            "overdue": 0,
            "high_priority_active": 0,
            "open_complaints": 0,
            "in_progress": 0,
            "on_hold": 0,
            "total_employees": 0,
        }


@router.get("/workload")
async def get_dashboard_workload(
    group_by: str = "department",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    try:
        await db.execute(text("SET LOCAL statement_timeout = '15000ms'"))
        admin_user, user_ids = await _resolve_scope_user_ids(db, current_user)
        recent_ids = _recent_task_ids_subquery(user_ids)

        user_agg_stmt = (
            select(
                User.id.label("user_id"),
                User.name.label("user_name"),
                User.role.label("user_role"),
                User.is_admin.label("user_is_admin"),
                func.count(Task.id).label("total_tasks"),
                func.coalesce(func.sum(case((Task.status == "done", 1), else_=0)), 0).label("completed"),
                func.coalesce(func.sum(case((Task.status.in_(["in-progress", "in_progress"]), 1), else_=0)), 0).label("in_progress"),
                func.coalesce(func.sum(case((~Task.status.in_(["done", "in-progress", "in_progress"]), 1), else_=0)), 0).label("todo"),
                func.coalesce(func.avg(func.coalesce(Task.priority_score, 0.0)), 0.0).label("avg_priority_score"),
                func.coalesce(func.sum(case((func.lower(func.coalesce(Task.priority_label, "")) == "high", 1), else_=0)), 0).label("high_priority_count"),
                func.coalesce(func.sum(case((func.lower(func.coalesce(Task.priority_label, "")) == "medium", 1), else_=0)), 0).label("medium_priority_count"),
            )
            .join(Task, Task.assignee_id == User.id)
            .join(recent_ids, Task.id == recent_ids.c.id)
            .where(User.id.in_(user_ids))
            .group_by(User.id, User.name, User.role, User.is_admin)
        )

        user_rows = (await db.execute(user_agg_stmt)).all()

        user_output = []
        for row in user_rows:
            user_output.append(
                {
                    "user_id": int(row.user_id),
                    "user_name": row.user_name,
                    "total_tasks": int(row.total_tasks or 0),
                    "completed": int(row.completed or 0),
                    "in_progress": int(row.in_progress or 0),
                    "todo": int(row.todo or 0),
                    "avg_priority_score": float(row.avg_priority_score or 0.0),
                    "high_priority_count": int(row.high_priority_count or 0),
                    "medium_priority_count": int(row.medium_priority_count or 0),
                    "low_priority_count": max(0, int(row.total_tasks or 0) - int(row.high_priority_count or 0) - int(row.medium_priority_count or 0)),
                    "department": _dept_from_user(row.user_role, bool(row.user_is_admin)),
                }
            )

        if not admin_user:
            return user_output

        if group_by == "user":
            user_output.sort(key=lambda x: x["total_tasks"], reverse=True)
            return user_output[:20]

        grouped: dict[str, dict] = {}
        for row in user_output:
            dept = row["department"]
            bucket = grouped.setdefault(
                dept,
                {
                    "department": dept,
                    "total_tasks": 0,
                    "completed": 0,
                    "in_progress": 0,
                    "todo": 0,
                    "avg_priority_score": 0.0,
                    "high_priority_count": 0,
                    "medium_priority_count": 0,
                    "low_priority_count": 0,
                    "employee_count": 0,
                    "_priority_weighted_sum": 0.0,
                },
            )
            bucket["total_tasks"] += row["total_tasks"]
            bucket["completed"] += row["completed"]
            bucket["in_progress"] += row["in_progress"]
            bucket["todo"] += row["todo"]
            bucket["high_priority_count"] += row["high_priority_count"]
            bucket["medium_priority_count"] += row["medium_priority_count"]
            bucket["low_priority_count"] += row["low_priority_count"]
            bucket["employee_count"] += 1
            bucket["_priority_weighted_sum"] += row["avg_priority_score"] * row["total_tasks"]

        output = []
        for item in grouped.values():
            total = item["total_tasks"]
            item["avg_priority_score"] = float(item["_priority_weighted_sum"] / total) if total else 0.0
            item.pop("_priority_weighted_sum", None)
            output.append(item)

        output.sort(key=lambda x: x["department"])
        return output
    except Exception:
        return []


@router.get("/bottlenecks")
async def get_dashboard_bottlenecks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    try:
        await db.execute(text("SET LOCAL statement_timeout = '15000ms'"))
        _, user_ids = await _resolve_scope_user_ids(db, current_user)
        recent_ids = _recent_task_ids_subquery(user_ids)

        stalled_hours_expr = (func.extract("epoch", func.now() - func.coalesce(Task.updated_at, Task.created_at)) / 3600.0)
        bottleneck_stmt = (
            select(
                Task.task_id,
                Task.id,
                Task.title,
                Task.status,
                Task.priority_score,
                Task.priority_label,
                Task.deadline_days,
                User.name.label("assignee_name"),
                stalled_hours_expr.label("hours_stalled"),
            )
            .join(recent_ids, Task.id == recent_ids.c.id)
            .join(User, Task.assignee_id == User.id, isouter=True)
            .where(
                Task.status.in_(ACTIVE_STATUSES),
                func.coalesce(Task.priority_score, 0) > 50,
                stalled_hours_expr > 24,
            )
            .order_by(Task.priority_score.desc())
            .limit(20)
        )

        task_rows = (await db.execute(bottleneck_stmt)).all()
        return [
            {
                "task_id": int(row.task_id if row.task_id is not None else row.id),
                "title": row.title,
                "status": row.status,
                "priority_score": float(row.priority_score or 0.0),
                "priority_label": row.priority_label,
                "assignee_name": row.assignee_name or "Unassigned",
                "hours_stalled": float(row.hours_stalled or 0.0),
                "deadline_days": int(row.deadline_days or 0),
            }
            for row in task_rows
        ]
    except Exception:
        return []


@router.get("/departments")
async def get_dashboard_departments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)
    if not is_admin_user(current_user):
        return []

    try:
        await db.execute(text("SET LOCAL statement_timeout = '15000ms'"))
        _, user_ids = await _resolve_scope_user_ids(db, current_user)
        recent_ids = _recent_task_ids_subquery(user_ids)

        task_rows_stmt = (
            select(
                Task.id.label("task_id"),
                Task.status,
                Task.created_at,
                Task.deadline_days,
                User.id.label("user_id"),
                User.role,
                User.is_admin,
            )
            .join(recent_ids, Task.id == recent_ids.c.id)
            .join(User, Task.assignee_id == User.id)
        )
        task_rows = (await db.execute(task_rows_stmt)).all()

        grouped: dict[str, dict] = {}
        task_to_dept: dict[int, str] = {}

        for row in task_rows:
            dept = _dept_from_user(row.role, bool(row.is_admin))
            bucket = grouped.setdefault(
                dept,
                {
                    "department": dept,
                    "employee_ids": set(),
                    "total_tasks_assigned": 0,
                    "open_tasks": 0,
                    "overdue_tasks": 0,
                    "complaints_handled": 0,
                },
            )
            bucket["employee_ids"].add(int(row.user_id))
            bucket["total_tasks_assigned"] += 1
            if row.status != "done":
                bucket["open_tasks"] += 1
                if row.created_at and row.deadline_days is not None:
                    age_days = (datetime.utcnow() - row.created_at).total_seconds() / 86400.0
                    if age_days > float(row.deadline_days):
                        bucket["overdue_tasks"] += 1

            task_to_dept[int(row.task_id)] = dept

        complaints_stmt = select(Complaint.linked_task_id).where(
            Complaint.linked_task_id.in_(select(recent_ids.c.id))
        )
        complaint_rows = (await db.execute(complaints_stmt)).scalars().all()
        for task_id in complaint_rows:
            if task_id is None:
                continue
            dept = task_to_dept.get(int(task_id))
            if dept and dept in grouped:
                grouped[dept]["complaints_handled"] += 1

        result = []
        for bucket in grouped.values():
            result.append(
                {
                    "department": bucket["department"],
                    "employee_count": len(bucket["employee_ids"]),
                    "total_tasks_assigned": int(bucket["total_tasks_assigned"]),
                    "open_tasks": int(bucket["open_tasks"]),
                    "overdue_tasks": int(bucket["overdue_tasks"]),
                    "complaints_handled": int(bucket["complaints_handled"]),
                }
            )

        result.sort(key=lambda x: x["overdue_tasks"], reverse=True)
        return result
    except Exception:
        return []


@router.get("/operational-notes")
async def get_operational_notes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_password_reset_completed(current_user)

    try:
        admin_user, user_ids = await _resolve_scope_user_ids(db, current_user)
        metrics = await _compute_summary(db, user_ids, admin_user)

        groq_notes = _try_groq_operational_notes(metrics)
        if groq_notes:
            return groq_notes
        return _heuristic_operational_notes(metrics)
    except Exception:
        return {
            "high_risk_window": "Operational note generation is temporarily unavailable.",
            "team_throughput": "Retry shortly after data refresh.",
            "source": "fallback",
        }
