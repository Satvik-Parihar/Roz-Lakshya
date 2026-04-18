import os
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import Json, execute_values


DEFAULT_DB_URL = "postgresql://postgres:12421@192.168.184.157:5432/Roz-Lakshya"

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[2]
EMPLOYEES_CSV = PROJECT_ROOT / "employees.csv"
TASKS_CSV = PROJECT_ROOT / "TS-PS13_enhanced.csv"
ENV_FILE = PROJECT_ROOT / "backend" / ".env"


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
        normalized = "postgresql://" + normalized[len("postgresql+asyncpg://"):]

    if "sslmode=" not in normalized:
        normalized = f"{normalized}{'&' if '?' in normalized else '?'}sslmode=require"

    return normalized


def _resolve_db_url() -> str:
    env_url = os.getenv("DATABASE_URL") or _read_env_file_value("DATABASE_URL")
    return _normalize_db_url(env_url or DEFAULT_DB_URL)


DB_URL = _resolve_db_url()


def _normalize_name(value: str) -> str:
    return str(value or "").strip().lower()


def _fill_priority_label(score: float, label: str) -> str:
    if pd.notna(label) and str(label).strip() != "":
        return str(label).strip()
    if float(score) > 6:
        return "High"
    if float(score) >= 3:
        return "Medium"
    return "Low"


def _map_role(department: str, designation: str) -> str:
    dept = str(department or "").strip()
    desig = str(designation or "").strip().lower()

    if any(token in desig for token in ["manager", "lead", "head"]):
        return "manager"

    if dept in {"HR", "Legal", "Finance"}:
        return "manager"

    return "team_member"


def _map_task_status(csv_status: str) -> str:
    status = str(csv_status or "").strip().lower()
    if status == "completed":
        return "done"
    if status == "in progress":
        return "in-progress"
    if status in {"pending", "on hold", "overdue"}:
        return "todo"
    return "todo"


def _classify_category(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ["product", "item", "quality", "mislabelled"]):
        return "Product"
    if any(k in t for k in ["package", "box", "shipping", "delivery"]):
        return "Packaging"
    if any(k in t for k in ["trade", "vendor", "distributor"]):
        return "Trade"
    if any(k in t for k in ["process", "step", "flow", "sla", "response"]):
        return "Process"
    return "Other"


def _classify_priority(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ["urgent", "recall", "illegal", "blocking", "sla"]):
        return "High"
    if any(k in t for k in ["delayed", "slow", "error", "exceeded"]):
        return "Medium"
    return "Low"


def _chunked(items, chunk_size: int):
    for i in range(0, len(items), chunk_size):
        yield items[i:i + chunk_size]


def main() -> None:
    if not EMPLOYEES_CSV.exists():
        raise FileNotFoundError(f"employees.csv not found at {EMPLOYEES_CSV}")
    if not TASKS_CSV.exists():
        raise FileNotFoundError(f"TS-PS13_enhanced.csv not found at {TASKS_CSV}")

    print("Loading CSV files...")
    employees_df = pd.read_csv(EMPLOYEES_CSV)
    tasks_df = pd.read_csv(TASKS_CSV)

    tasks_df["priority_label"] = tasks_df.apply(
        lambda row: _fill_priority_label(row.get("priority_score", 0.0), row.get("priority_label")),
        axis=1,
    )

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    try:
        # Prepare unique constraints for idempotent seed runs.
        cur.execute("DELETE FROM users a USING users b WHERE a.ctid < b.ctid AND a.name = b.name")
        cur.execute(
            "DELETE FROM complaints a USING complaints b "
            "WHERE a.ctid < b.ctid AND a.linked_task_id = b.linked_task_id AND a.text = b.text"
        )
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON users(name)")
        cur.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_task_text_unique ON complaints(linked_task_id, text)"
        )
        conn.commit()

        # STEP 1 — Users
        user_rows = []
        for _, row in employees_df.iterrows():
            user_rows.append((
                str(row["name"]).strip(),
                _map_role(row.get("department"), row.get("designation")),
            ))

        execute_values(
            cur,
            """
            INSERT INTO users (name, role)
            VALUES %s
            ON CONFLICT (name) DO UPDATE
            SET role = EXCLUDED.role
            """,
            user_rows,
            page_size=500,
        )
        conn.commit()

        print(f"Upserted {len(user_rows)} users from employees.csv")

        cur.execute("SELECT id, name FROM users")
        name_to_user_id = {_normalize_name(name): user_id for user_id, name in cur.fetchall()}

        employee_to_user_id = {}
        for _, row in employees_df.iterrows():
            employee_to_user_id[str(row["employee_id"]).strip()] = name_to_user_id.get(
                _normalize_name(row["name"])
            )

        # STEP 2 — Tasks
        total_tasks = len(tasks_df)
        task_rows = []
        now = datetime.now(UTC).replace(tzinfo=None)

        for i, (_, row) in enumerate(tasks_df.iterrows(), start=1):
            employee_id = str(row.get("employee_id", "")).strip()
            assignee_id = employee_to_user_id.get(employee_id)

            created_at = now - timedelta(
                days=random.randint(1, 60),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )
            updated_at = created_at + timedelta(hours=random.randint(1, 48))

            score = float(row.get("priority_score", 0.0))
            effort = int(row.get("effort", 1))
            impact = int(row.get("impact", 1))
            deadline_days = int(row.get("deadline_days", 1))

            task_rows.append((
                int(row["task_id"]),
                str(row.get("task_description", "")).strip() or f"Task #{int(row['task_id'])}",
                None,
                assignee_id,
                deadline_days,
                effort,
                impact,
                int(row.get("workload", 1)),
                _map_task_status(row.get("status")),
                score,
                _fill_priority_label(score, row.get("priority_label")),
                0.0,
                f"ML scored: impact={impact}, effort={effort}, deadline={deadline_days}d",
                created_at,
                updated_at,
            ))

            if len(task_rows) >= 1000:
                execute_values(
                    cur,
                    """
                    INSERT INTO tasks (
                        task_id, title, description, assignee_id,
                        deadline_days, effort, impact, workload,
                        status, priority_score, priority_label,
                        complaint_boost, ai_reasoning, created_at, updated_at
                    )
                    VALUES %s
                    ON CONFLICT (task_id) DO UPDATE SET
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        assignee_id = EXCLUDED.assignee_id,
                        deadline_days = EXCLUDED.deadline_days,
                        effort = EXCLUDED.effort,
                        impact = EXCLUDED.impact,
                        workload = EXCLUDED.workload,
                        status = EXCLUDED.status,
                        priority_score = EXCLUDED.priority_score,
                        priority_label = EXCLUDED.priority_label,
                        complaint_boost = EXCLUDED.complaint_boost,
                        ai_reasoning = EXCLUDED.ai_reasoning,
                        created_at = EXCLUDED.created_at,
                        updated_at = EXCLUDED.updated_at
                    """,
                    task_rows,
                    page_size=1000,
                )
                conn.commit()
                task_rows = []

            if i % 5000 == 0:
                print(f"Inserted {i}/{total_tasks} tasks...")

        if task_rows:
            execute_values(
                cur,
                """
                INSERT INTO tasks (
                    task_id, title, description, assignee_id,
                    deadline_days, effort, impact, workload,
                    status, priority_score, priority_label,
                    complaint_boost, ai_reasoning, created_at, updated_at
                )
                VALUES %s
                ON CONFLICT (task_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    assignee_id = EXCLUDED.assignee_id,
                    deadline_days = EXCLUDED.deadline_days,
                    effort = EXCLUDED.effort,
                    impact = EXCLUDED.impact,
                    workload = EXCLUDED.workload,
                    status = EXCLUDED.status,
                    priority_score = EXCLUDED.priority_score,
                    priority_label = EXCLUDED.priority_label,
                    complaint_boost = EXCLUDED.complaint_boost,
                    ai_reasoning = EXCLUDED.ai_reasoning,
                    created_at = EXCLUDED.created_at,
                    updated_at = EXCLUDED.updated_at
                """,
                task_rows,
                page_size=1000,
            )
            conn.commit()

        print(f"Upserted {total_tasks} tasks from TS-PS13_enhanced.csv")

        cur.execute("SELECT id, task_id, created_at FROM tasks")
        task_id_map = {
            int(task_id): {"db_id": int(db_id), "created_at": created_at}
            for db_id, task_id, created_at in cur.fetchall()
        }

        # STEP 3 — Complaints
        complaint_rows = []
        complaint_series = tasks_df["complaint"].fillna("").astype(str).str.strip()
        filtered = tasks_df[
            complaint_series.ne("")
            & complaint_series.str.lower().ne("nan")
            & complaint_series.str.lower().ne("none")
        ]

        for _, row in filtered.iterrows():
            task_key = int(row["task_id"])
            task_meta = task_id_map.get(task_key)
            if not task_meta:
                continue

            text = str(row["complaint"]).strip()
            priority = _classify_priority(text)
            urgency_score = 90.0 if priority == "High" else 60.0 if priority == "Medium" else 30.0
            sla_hours = 4 if priority == "High" else 8 if priority == "Medium" else 24

            complaint_rows.append((
                text,
                random.choice(["email", "call", "direct"]),
                _classify_category(text),
                priority,
                urgency_score,
                Json(["Review complaint", "Investigate root cause", "Contact customer", "Resolve and close"]),
                task_meta["db_id"],
                sla_hours,
                "open",
                task_meta["created_at"],
            ))

        for batch in _chunked(complaint_rows, 500):
            execute_values(
                cur,
                """
                INSERT INTO complaints (
                    text, channel, category, priority,
                    urgency_score, resolution_steps, linked_task_id,
                    sla_hours, status, created_at
                )
                VALUES %s
                ON CONFLICT (linked_task_id, text) DO UPDATE SET
                    channel = EXCLUDED.channel,
                    category = EXCLUDED.category,
                    priority = EXCLUDED.priority,
                    urgency_score = EXCLUDED.urgency_score,
                    resolution_steps = EXCLUDED.resolution_steps,
                    sla_hours = EXCLUDED.sla_hours,
                    status = EXCLUDED.status,
                    created_at = EXCLUDED.created_at
                """,
                batch,
                page_size=500,
            )
            conn.commit()

        print(f"Upserted {len(complaint_rows)} complaints from TS-PS13_enhanced.csv")

        # STEP 4 — Verify counts
        cur.execute("SELECT COUNT(*) FROM users")
        users_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM tasks")
        tasks_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM complaints")
        complaints_count = cur.fetchone()[0]
        print(f"DB state: {users_count} users | {tasks_count} tasks | {complaints_count} complaints")

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()