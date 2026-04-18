from datetime import datetime
import os

from fastapi import APIRouter, Depends
import pandas as pd
from sqlalchemy import and_, case, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import Complaint, Task, User

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)


_EMP_CSV = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "employees.csv")
)


def _load_employee_csv() -> pd.DataFrame | None:
    if not os.path.exists(_EMP_CSV):
        return None
    try:
        return pd.read_csv(_EMP_CSV)
    except Exception:
        return None


_emp_df = _load_employee_csv()


def _normalize_name(value: str | None) -> str:
    return str(value or "").strip().lower()


def _build_name_department_map() -> dict[str, str]:
    if _emp_df is None or _emp_df.empty:
        return {}

    lookup: dict[str, str] = {}
    for _, row in _emp_df.iterrows():
        lookup[_normalize_name(row.get("name"))] = str(row.get("department", "Unknown")).strip() or "Unknown"
    return lookup


def _build_department_employee_counts() -> dict[str, int]:
    if _emp_df is None or _emp_df.empty:
        return {}
    counts = _emp_df.groupby("department", dropna=False)["employee_id"].count().to_dict()
    return {str(key): int(value) for key, value in counts.items()}


_name_to_department = _build_name_department_map()
_department_employee_counts = _build_department_employee_counts()


@router.get("/summary")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    try:
        start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        overdue_expr = (func.extract("epoch", func.now() - Task.created_at) / 86400.0) > Task.deadline_days

        task_agg_res = await db.execute(
            select(
                func.count(Task.id).label("total_tasks"),
                func.coalesce(
                    func.sum(
                        case(
                            (and_(Task.status == "done", Task.updated_at >= start_of_day), 1),
                            else_=0,
                        )
                    ),
                    0,
                ).label("completed_today"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                and_(
                                    Task.status == "todo",
                                    Task.created_at.is_not(None),
                                    Task.deadline_days.is_not(None),
                                    overdue_expr,
                                ),
                                1,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ).label("overdue"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                and_(
                                    func.lower(func.coalesce(Task.priority_label, "")) == "high",
                                    Task.status != "done",
                                ),
                                1,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ).label("high_priority_active"),
                func.coalesce(
                    func.sum(
                        case(
                            (Task.status.in_(["in-progress", "in_progress"]), 1),
                            else_=0,
                        )
                    ),
                    0,
                ).label("in_progress"),
                func.coalesce(
                    func.sum(
                        case(
                            (and_(Task.status == "todo", func.coalesce(Task.priority_score, 0) < 20), 1),
                            else_=0,
                        )
                    ),
                    0,
                ).label("on_hold"),
            )
        )
        task_agg = task_agg_res.first()

        open_complaints = int((await db.scalar(select(func.count()).select_from(Complaint).where(Complaint.status == "open"))) or 0)
        total_employees = int((await db.scalar(select(func.count()).select_from(User))) or 0)

        return {
            "total_tasks": int(task_agg.total_tasks or 0),
            "completed_today": int(task_agg.completed_today or 0),
            "overdue": int(task_agg.overdue or 0),
            "high_priority_active": int(task_agg.high_priority_active or 0),
            "open_complaints": open_complaints,
            "in_progress": int(task_agg.in_progress or 0),
            "on_hold": int(task_agg.on_hold or 0),
            "total_employees": total_employees,
        }
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
):
    try:
        user_agg_res = await db.execute(
            select(
                User.id.label("user_id"),
                User.name.label("user_name"),
                func.count(Task.id).label("total_tasks"),
                func.coalesce(func.sum(case((Task.status == "done", 1), else_=0)), 0).label("completed"),
                func.coalesce(
                    func.sum(case((Task.status.in_(["in-progress", "in_progress"]), 1), else_=0)),
                    0,
                ).label("in_progress"),
                func.coalesce(
                    func.sum(case((~Task.status.in_(["done", "in-progress", "in_progress"]), 1), else_=0)),
                    0,
                ).label("todo"),
                func.coalesce(func.avg(func.coalesce(Task.priority_score, 0.0)), 0.0).label("avg_priority_score"),
                func.coalesce(
                    func.sum(case((func.lower(func.coalesce(Task.priority_label, "")) == "high", 1), else_=0)),
                    0,
                ).label("high_priority_count"),
                func.coalesce(
                    func.sum(case((func.lower(func.coalesce(Task.priority_label, "")) == "medium", 1), else_=0)),
                    0,
                ).label("medium_priority_count"),
            )
            .join(Task, Task.assignee_id == User.id)
            .group_by(User.id, User.name)
        )
        user_rows = user_agg_res.all()

        if group_by == "user":
            output = []
            for row in user_rows:
                output.append(
                    {
                        "user_id": int(row.user_id),
                        "user_name": row.user_name,
                        "total_tasks": int(row.total_tasks or 0),
                        "completed": int(row.completed or 0),
                        "in_progress": int(row.in_progress or 0),
                        "todo": int(row.todo or 0),
                        "avg_priority_score": float(row.avg_priority_score or 0.0),
                    }
                )

            output.sort(key=lambda x: x["total_tasks"], reverse=True)
            return output[:20]

        if _emp_df is None:
            return []

        grouped: dict[str, dict] = {}

        for row in user_rows:
            department = _name_to_department.get(_normalize_name(row.user_name), "Unknown")
            if department not in grouped:
                grouped[department] = {
                    "department": department,
                    "total_tasks": 0,
                    "completed": 0,
                    "in_progress": 0,
                    "todo": 0,
                    "high_priority_count": 0,
                    "medium_priority_count": 0,
                    "low_priority_count": 0,
                    "_priority_weighted_sum": 0.0,
                    "_employee_count_from_tasks": 0,
                }

            bucket = grouped[department]
            user_total = int(row.total_tasks or 0)
            user_completed = int(row.completed or 0)
            user_in_progress = int(row.in_progress or 0)
            user_todo = int(row.todo or 0)
            user_high = int(row.high_priority_count or 0)
            user_medium = int(row.medium_priority_count or 0)
            user_low = max(0, user_total - user_high - user_medium)

            bucket["total_tasks"] += user_total
            bucket["completed"] += user_completed
            bucket["in_progress"] += user_in_progress
            bucket["todo"] += user_todo
            bucket["high_priority_count"] += user_high
            bucket["medium_priority_count"] += user_medium
            bucket["low_priority_count"] += user_low
            bucket["_priority_weighted_sum"] += float(row.avg_priority_score or 0.0) * user_total
            bucket["_employee_count_from_tasks"] += 1

        output = []
        for item in grouped.values():
            total = item["total_tasks"]
            avg_priority = (item["_priority_weighted_sum"] / total) if total > 0 else 0.0
            output.append(
                {
                    "department": item["department"],
                    "total_tasks": item["total_tasks"],
                    "completed": item["completed"],
                    "in_progress": item["in_progress"],
                    "todo": item["todo"],
                    "avg_priority_score": float(avg_priority),
                    "high_priority_count": item["high_priority_count"],
                    "medium_priority_count": item["medium_priority_count"],
                    "low_priority_count": item["low_priority_count"],
                    "employee_count": int(
                        _department_employee_counts.get(
                            item["department"],
                            item["_employee_count_from_tasks"],
                        )
                    ),
                }
            )

        output.sort(key=lambda x: x["department"])
        return output
    except Exception:
        return []


@router.get("/bottlenecks")
async def get_dashboard_bottlenecks(db: AsyncSession = Depends(get_db)):
    try:
        active_statuses = ["todo", "in-progress", "in_progress"]
        stalled_hours_expr = (func.extract("epoch", func.now() - func.coalesce(Task.updated_at, Task.created_at)) / 3600.0)

        tasks_res = await db.execute(
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
            .join(User, Task.assignee_id == User.id, isouter=True)
            .where(
                Task.status.in_(active_statuses),
                func.coalesce(Task.priority_score, 0) > 50,
                stalled_hours_expr > 24,
            )
            .order_by(Task.priority_score.desc())
            .limit(20)
        )
        task_rows = tasks_res.all()

        bottlenecks = []
        for row in task_rows:
            bottlenecks.append(
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
            )
        return bottlenecks
    except Exception:
        return []


@router.get("/departments")
async def get_dashboard_departments():
    try:
        if _emp_df is None or _emp_df.empty:
            return []

        df = _emp_df.copy()
        numeric_cols = [
            "total_tasks_assigned",
            "open_tasks",
            "overdue_tasks",
            "complaints_handled",
        ]
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        grouped = (
            df.groupby("department", dropna=False)
            .agg(
                employee_count=("employee_id", "count"),
                total_tasks_assigned=("total_tasks_assigned", "sum"),
                open_tasks=("open_tasks", "sum"),
                overdue_tasks=("overdue_tasks", "sum"),
                complaints_handled=("complaints_handled", "sum"),
            )
            .reset_index()
            .sort_values("overdue_tasks", ascending=False)
        )

        result = []
        for _, row in grouped.iterrows():
            result.append(
                {
                    "department": str(row["department"]),
                    "employee_count": int(row["employee_count"]),
                    "total_tasks_assigned": int(row["total_tasks_assigned"]),
                    "open_tasks": int(row["open_tasks"]),
                    "overdue_tasks": int(row["overdue_tasks"]),
                    "complaints_handled": int(row["complaints_handled"]),
                }
            )

        return result
    except Exception:
        return []
