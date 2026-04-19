import argparse
import os
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import psycopg2

try:
    from tabulate import tabulate
except Exception:
    tabulate = None


DEFAULT_DB_URL = "postgresql://postgres:12421@192.168.184.157:5432/Roz-Lakshya"
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[2]
BACKEND_ROOT = SCRIPT_DIR.parents[1]
ENV_FILE = BACKEND_ROOT / ".env"
EMPLOYEES_CSV = PROJECT_ROOT / "employees.csv"
MODEL_PATH = SCRIPT_DIR / "priority_model.pkl"


def _read_env_file_value(key: str) -> str | None:
    if not ENV_FILE.exists():
        return None

    try:
        for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k.strip() == key:
                return v.strip().strip('"').strip("'")
    except Exception:
        return None

    return None


def _normalize_db_url(db_url: str) -> str:
    normalized = db_url.strip()
    if normalized.startswith("postgresql+asyncpg://"):
        normalized = "postgresql://" + normalized[len("postgresql+asyncpg://") :]
    if "sslmode=" not in normalized:
        normalized = f"{normalized}{'&' if '?' in normalized else '?'}sslmode=require"
    return normalized


def _resolve_db_url() -> str:
    env_url = os.getenv("DATABASE_URL") or _read_env_file_value("DATABASE_URL")
    return _normalize_db_url(env_url or DEFAULT_DB_URL)


def _hr(title: str) -> None:
    line = "-" * 37
    print(f"\n{line}")
    print(title)
    print(line)


def _format_table(headers: list[str], rows: list[list], use_grid: bool = False) -> str:
    if tabulate is not None:
        tablefmt = "grid" if use_grid else "simple"
        return tabulate(rows, headers=headers, tablefmt=tablefmt)

    widths = [len(str(h)) for h in headers]
    for row in rows:
        for idx, cell in enumerate(row):
            widths[idx] = max(widths[idx], len(str(cell)))

    def fmt_row(row_vals):
        return " | ".join(str(val).ljust(widths[idx]) for idx, val in enumerate(row_vals))

    sep = "-+-".join("-" * w for w in widths)
    out = [fmt_row(headers), sep]
    out.extend(fmt_row(r) for r in rows)
    return "\n".join(out)


def _safe_pct(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return (numerator / denominator) * 100.0


def _truncate(text: str, width: int = 50) -> str:
    t = str(text or "").strip()
    if len(t) <= width:
        return t
    return t[: width - 3] + "..."


def _column_exists(cur, table_name: str, column_name: str) -> bool:
    try:
        cur.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
            LIMIT 1
            """,
            (table_name, column_name),
        )
        return cur.fetchone() is not None
    except Exception:
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Roz-Lakshya system report")
    parser.add_argument("--all", action="store_true", help="Show all users in SECTION 2")
    args = parser.parse_args()

    print("Generating Roz-Lakshya system report...")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    db_url = _resolve_db_url()
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    has_manual_boost = _column_exists(cur, "tasks", "manual_priority_boost")
    has_is_pinned = _column_exists(cur, "tasks", "is_pinned")

    # SECTION 1
    _hr("SECTION 1: SYSTEM OVERVIEW")
    cur.execute("SELECT COUNT(*) FROM users")
    total_users = int(cur.fetchone()[0])

    cur.execute("SELECT COUNT(*) FROM tasks")
    total_tasks = int(cur.fetchone()[0])

    cur.execute("SELECT COUNT(*) FROM complaints")
    total_complaints = int(cur.fetchone()[0])

    cur.execute("SELECT COUNT(*), COUNT(*) FILTER (WHERE is_read = false) FROM alerts")
    total_alerts, unread_alerts = cur.fetchone()
    total_alerts = int(total_alerts or 0)
    unread_alerts = int(unread_alerts or 0)

    groq_key = os.getenv("GROQ_API_KEY") or _read_env_file_value("GROQ_API_KEY") or ""

    print("+------------------------------------------------------+")
    print("|                  ROZ-LAKSHYA TS-13                  |")
    print("+------------------------------------------------------+")
    print(f"Total Users:       {total_users}")
    print(f"Total Tasks:       {total_tasks}")
    print(f"Total Complaints:  {total_complaints}")
    print(f"Total Alerts:      {total_alerts} ({unread_alerts} unread)")
    print(f"ML Model:          priority_model.pkl - {'FOUND' if MODEL_PATH.exists() else 'NOT FOUND'}")
    print(f"Groq API Key:      {'SET' if groq_key else 'NOT SET'}")

    # SECTION 2
    _hr("SECTION 2: ALL USERS & ACCESS")
    cur.execute(
        """
        SELECT
            u.id,
            u.name,
            u.role,
            COALESCE(ta.tasks_assigned, 0) AS tasks_assigned,
            COALESCE(td.tasks_done, 0) AS tasks_done,
            COALESCE(ov.overdue_tasks, 0) AS overdue_tasks,
            COALESCE(cl.complaints_linked, 0) AS complaints_linked
        FROM users u
        LEFT JOIN (
            SELECT assignee_id, COUNT(*) AS tasks_assigned
            FROM tasks
            GROUP BY assignee_id
        ) ta ON ta.assignee_id = u.id
        LEFT JOIN (
            SELECT assignee_id, COUNT(*) AS tasks_done
            FROM tasks
            WHERE status = 'done'
            GROUP BY assignee_id
        ) td ON td.assignee_id = u.id
        LEFT JOIN (
            SELECT assignee_id, COUNT(*) AS overdue_tasks
            FROM tasks
            WHERE status != 'done'
              AND (created_at + (deadline_days * INTERVAL '1 day')) < NOW()
            GROUP BY assignee_id
        ) ov ON ov.assignee_id = u.id
        LEFT JOIN (
            SELECT t.assignee_id, COUNT(c.id) AS complaints_linked
            FROM tasks t
            LEFT JOIN complaints c ON c.linked_task_id = t.id
            GROUP BY t.assignee_id
        ) cl ON cl.assignee_id = u.id
        ORDER BY tasks_assigned DESC, u.name ASC
        """
    )
    user_rows = cur.fetchall()

    display_rows = user_rows if args.all else user_rows[:30]
    table_rows = []
    for row in display_rows:
        uid, name, role, assigned, done, overdue, complaints_linked = row
        assigned_i = int(assigned or 0)
        done_i = int(done or 0)
        completion_rate = f"{_safe_pct(done_i, assigned_i):.1f}%"
        table_rows.append(
            [
                uid,
                name,
                role,
                assigned_i,
                done_i,
                completion_rate,
                int(overdue or 0),
                int(complaints_linked or 0),
            ]
        )

    print(
        _format_table(
            [
                "ID",
                "Name",
                "Role",
                "Tasks Assigned",
                "Tasks Done",
                "Completion Rate",
                "Overdue Tasks",
                "Complaints Linked",
            ],
            table_rows,
        )
    )

    if not args.all and len(user_rows) > 30:
        print(f"\n... and {len(user_rows) - 30} more users not shown. Run with --all to see all.")

    # SECTION 3
    _hr("SECTION 3: TASK PRIORITY BREAKDOWN")
    pinned_expr = "COUNT(*) FILTER (WHERE COALESCE(is_pinned, false) = true)" if has_is_pinned else "0"
    boosted_expr = "COUNT(*) FILTER (WHERE COALESCE(manual_priority_boost, 0) > 0)" if has_manual_boost else "0"
    cur.execute(
        f"""
        SELECT
            COUNT(*) FILTER (WHERE LOWER(COALESCE(priority_label, '')) = 'high') AS high_count,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(priority_label, '')) = 'medium') AS medium_count,
            COUNT(*) FILTER (WHERE LOWER(COALESCE(priority_label, '')) = 'low') AS low_count,
            {pinned_expr} AS pinned_count,
            {boosted_expr} AS boosted_count
        FROM tasks
        """
    )
    high_count, medium_count, low_count, pinned_count, boosted_count = cur.fetchone()
    high_count = int(high_count or 0)
    medium_count = int(medium_count or 0)
    low_count = int(low_count or 0)
    pinned_count = int(pinned_count or 0)
    boosted_count = int(boosted_count or 0)

    print(f"High Priority Tasks:    {high_count} ({_safe_pct(high_count, total_tasks):.1f}% of total)")
    print(f"Medium Priority Tasks:  {medium_count} ({_safe_pct(medium_count, total_tasks):.1f}% of total)")
    print(f"Low Priority Tasks:     {low_count} ({_safe_pct(low_count, total_tasks):.1f}% of total)")
    print(f"Pinned Tasks:           {pinned_count}")
    print(f"Admin-Boosted Tasks:    {boosted_count} (manual_priority_boost > 0)")

    cur.execute(
        """
        SELECT
            t.task_id,
            t.title,
            t.priority_score,
            t.priority_label,
            COALESCE(u.name, 'Unassigned') AS assignee,
            t.status
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assignee_id
        ORDER BY COALESCE(t.priority_score, 0) DESC, t.task_id ASC
        LIMIT 10
        """
    )
    top_scored = cur.fetchall()

    print("\nTop 10 Highest Scored Tasks:")
    top_rows = []
    for idx, row in enumerate(top_scored, start=1):
        task_id, title, score, label, assignee, status = row
        top_rows.append([idx, task_id, _truncate(title, 50), f"{float(score or 0):.2f}", label or "-", assignee, status])
    print(_format_table(["Rank", "Task ID", "Title", "Score", "Label", "Assignee", "Status"], top_rows))

    cur.execute(
        """
        SELECT
            t.task_id,
            t.title,
            EXTRACT(EPOCH FROM (NOW() - (t.created_at + (t.deadline_days * INTERVAL '1 day')))) / 86400.0 AS days_overdue,
            COALESCE(u.name, 'Unassigned') AS assignee,
            COALESCE(t.priority_label, '-') AS priority
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assignee_id
        WHERE t.status != 'done'
          AND (t.created_at + (t.deadline_days * INTERVAL '1 day')) < NOW()
        ORDER BY days_overdue DESC
        LIMIT 10
        """
    )
    top_overdue = cur.fetchall()

    print("\nTop 10 Most Overdue Tasks:")
    overdue_rows = []
    for row in top_overdue:
        task_id, title, days_overdue, assignee, priority = row
        overdue_rows.append([task_id, _truncate(title, 50), f"{float(days_overdue or 0):.1f}", assignee, priority])
    print(_format_table(["Task ID", "Title", "Days Overdue", "Assignee", "Priority"], overdue_rows))

    # SECTION 4
    _hr("SECTION 4: DEPARTMENT SUMMARY")
    if EMPLOYEES_CSV.exists():
        employees_df = pd.read_csv(EMPLOYEES_CSV)
        employees_df["name_norm"] = employees_df["name"].astype(str).str.strip().str.lower()
        name_to_department = (
            employees_df[["name_norm", "department"]]
            .dropna(subset=["name_norm"]) 
            .drop_duplicates(subset=["name_norm"], keep="first")
            .set_index("name_norm")["department"]
            .to_dict()
        )
        dept_employee_counts = employees_df.groupby("department", dropna=False)["employee_id"].count().to_dict()

        cur.execute(
            """
            SELECT
                u.name,
                t.status,
                t.priority_score,
                t.priority_label,
                t.created_at,
                t.deadline_days
            FROM tasks t
            JOIN users u ON u.id = t.assignee_id
            """
        )
        task_rows = cur.fetchall()

        now = datetime.now()
        dept_stats = {}
        for row in task_rows:
            user_name, status, score, label, created_at, deadline_days = row
            dept = str(name_to_department.get(str(user_name or "").strip().lower(), "Unknown"))
            bucket = dept_stats.setdefault(
                dept,
                {
                    "tasks": 0,
                    "done": 0,
                    "in_progress": 0,
                    "overdue": 0,
                    "score_sum": 0.0,
                    "score_count": 0,
                    "high": 0,
                },
            )
            bucket["tasks"] += 1

            normalized_status = str(status or "").strip().lower().replace("_", "-")
            if normalized_status == "done":
                bucket["done"] += 1
            elif normalized_status == "in-progress":
                bucket["in_progress"] += 1

            if normalized_status != "done" and created_at and deadline_days is not None:
                deadline_ts = created_at + timedelta(days=int(deadline_days))
                if deadline_ts < now:
                    bucket["overdue"] += 1

            if score is not None:
                bucket["score_sum"] += float(score)
                bucket["score_count"] += 1

            if str(label or "").strip().lower() == "high":
                bucket["high"] += 1

        all_departments = sorted(set(list(dept_employee_counts.keys()) + list(dept_stats.keys())))
        dept_rows = []
        for dept in all_departments:
            stats = dept_stats.get(
                dept,
                {
                    "tasks": 0,
                    "done": 0,
                    "in_progress": 0,
                    "overdue": 0,
                    "score_sum": 0.0,
                    "score_count": 0,
                    "high": 0,
                },
            )
            avg_score = stats["score_sum"] / stats["score_count"] if stats["score_count"] else 0.0
            dept_rows.append(
                [
                    dept,
                    int(dept_employee_counts.get(dept, 0)),
                    stats["tasks"],
                    stats["done"],
                    stats["in_progress"],
                    stats["overdue"],
                    f"{avg_score:.2f}",
                    stats["high"],
                ]
            )

        print(
            _format_table(
                [
                    "Department",
                    "Employees",
                    "Tasks",
                    "Done",
                    "In-Progress",
                    "Overdue",
                    "Avg Score",
                    "High Priority Count",
                ],
                dept_rows,
            )
        )
    else:
        print("employees.csv not found. Department summary unavailable.")

    # SECTION 5
    _hr("SECTION 5: COMPLAINT SUMMARY")
    cur.execute(
        """
        SELECT
            COUNT(*) FILTER (WHERE status = 'open') AS open_count,
            COUNT(*) FILTER (WHERE status = 'in-progress') AS in_progress_count,
            COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count
        FROM complaints
        """
    )
    open_count, in_prog_count, resolved_count = cur.fetchone()

    print(f"Open Complaints:      {int(open_count or 0)}")
    print(f"In-Progress:          {int(in_prog_count or 0)}")
    print(f"Resolved:             {int(resolved_count or 0)}")

    cur.execute(
        """
        SELECT category, COUNT(*)
        FROM complaints
        GROUP BY category
        """
    )
    category_counts = {str(cat or "Other"): int(cnt or 0) for cat, cnt in cur.fetchall()}

    print("\nBy Category:")
    for key in ["Product", "Packaging", "Trade", "Process", "Other"]:
        print(f"  {key}: {int(category_counts.get(key, 0))}")

    cur.execute(
        """
        SELECT priority, COUNT(*)
        FROM complaints
        GROUP BY priority
        """
    )
    priority_counts = {str(p or "Low"): int(cnt or 0) for p, cnt in cur.fetchall()}

    print("\nBy Priority:")
    for key in ["High", "Medium", "Low"]:
        print(f"  {key}: {int(priority_counts.get(key, 0))}")

    cur.execute("SELECT COUNT(*) FROM tasks WHERE COALESCE(complaint_boost, 0) > 0")
    boosted_tasks = int(cur.fetchone()[0] or 0)
    print(f"\nTasks Boosted by Complaints: {boosted_tasks}")

    # SECTION 6
    _hr("SECTION 6: ALERT SUMMARY")
    cur.execute(
        """
        SELECT
            COUNT(*) FILTER (WHERE type = 'task_overdue') AS task_overdue,
            COUNT(*) FILTER (WHERE type = 'task_due_soon') AS task_due_soon,
            COUNT(*) FILTER (WHERE type = 'sla_breach') AS sla_breach,
            COUNT(*) FILTER (WHERE is_read = false) AS unread
        FROM alerts
        """
    )
    task_overdue_count, task_due_soon_count, sla_breach_count, unread = cur.fetchone()
    print(f"task_overdue alerts:   {int(task_overdue_count or 0)}")
    print(f"task_due_soon alerts:  {int(task_due_soon_count or 0)}")
    print(f"sla_breach alerts:     {int(sla_breach_count or 0)}")
    print(f"Unread alerts:         {int(unread or 0)}")

    # SECTION 7
    _hr("SECTION 7: LOGIN CREDENTIALS")
    print("+----------------------------------------------+")
    print("|           DEMO LOGIN CREDENTIALS             |")
    print("+----------------------------------------------+")
    print("| URL:       http://localhost:5173             |")
    print("| Email:     admin@gmail.com                   |")
    print("| Password:  admin123                          |")
    print("+----------------------------------------------+")
    print("| API Docs:  http://localhost:8000/docs        |")
    print("+----------------------------------------------+")

    print("\nAccess Levels:")
    print("- All routes (/tasks /plan /complaints /dashboard) require login")
    print("- Any valid session token grants full access")
    print("- Signup page creates a session using the demo account")
    print("- Admin override panel visible to admin@gmail.com only")

    # SECTION 8
    _hr("SECTION 8: QUICK TEST COMMANDS")
    print(
        """# Test login
curl -X POST http://localhost:8000/api/v1/users/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@gmail.com","password":"admin123"}'

# Get top tasks (replace TOKEN with value from login response)
curl http://localhost:8000/api/v1/tasks/?limit=5 \\
  -H "Authorization: Bearer TOKEN"

# Get dashboard summary
curl http://localhost:8000/api/v1/dashboard/summary \\
  -H "Authorization: Bearer TOKEN"

# Submit a complaint
curl -X POST http://localhost:8000/api/v1/complaints/ \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"text":"Payment gateway failing for all customers","channel":"call"}'

# Force alert check
curl -X POST http://localhost:8000/api/v1/alerts/trigger-check \\
  -H "Authorization: Bearer TOKEN"
"""
    )

    cur.close()
    conn.close()

    print("\n✅ Report complete. Share this output with your evaluator.")


if __name__ == "__main__":
    main()
