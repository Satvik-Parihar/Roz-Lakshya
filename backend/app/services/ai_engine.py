import json
import os
from datetime import datetime, timezone

import joblib

try:
    from groq import Groq
except Exception:
    Groq = None


_MODEL_PATH = os.path.join(os.path.dirname(__file__), "priority_model.pkl")
_model = None


def _get_model():
    global _model
    if _model is None and os.path.exists(_MODEL_PATH):
        _model = joblib.load(_MODEL_PATH)
    return _model


_groq_client = None


def _get_groq():
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if api_key and Groq is not None:
            _groq_client = Groq(api_key=api_key)
    return _groq_client

# ─── IN-MEMORY SCORE CACHE ───────────────────────────────────────────────────
_score_cache: dict = {}
CACHE_TTL_SECONDS = 300 

def _is_cache_valid(task_id: str) -> bool:
    if task_id not in _score_cache:
        return False
    cached_at = _score_cache[task_id].get("cached_at")
    if not cached_at:
        return False
    age = (datetime.now(timezone.utc) - cached_at).total_seconds()
    return age < CACHE_TTL_SECONDS

def invalidate_cache(task_id: str) -> None:
    _score_cache.pop(str(task_id), None)


def _strip_json_fences(raw: str) -> str:
    text = (raw or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def _safe_float(value, default: float) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _derive_deadline_days(task_data: dict) -> int:
    if task_data.get("deadline_days") is not None:
        return max(0, int(float(task_data.get("deadline_days"))))

    deadline = task_data.get("deadline")
    if not deadline:
        return 7

    if isinstance(deadline, datetime):
        deadline_dt = deadline
    else:
        deadline_str = str(deadline).strip()
        if deadline_str.endswith("Z"):
            deadline_str = deadline_str.replace("Z", "+00:00")
        try:
            deadline_dt = datetime.fromisoformat(deadline_str)
        except Exception:
            return 7

    now = datetime.now(timezone.utc)
    if deadline_dt.tzinfo is None:
        deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)

    delta_days = (deadline_dt - now).total_seconds() / 86400.0
    return max(0, int(round(delta_days)))


def _priority_reasoning(deadline_days: int, impact: float, effort: float, workload: float, boost: float) -> str:
    if deadline_days <= 2:
        return f"High urgency: {deadline_days}d deadline with impact {impact:.0f}/10"
    if impact >= 8:
        return f"High business impact ({impact:.0f}/10) drives priority"
    if boost > 0:
        return f"Complaint boost (+{boost:.1f}) increased this task's urgency"
    if effort <= 3 and workload <= 4:
        return "Quick-win candidate with manageable effort and workload"
    return f"Balanced priority from deadline ({deadline_days}d), impact ({impact:.0f}/10), and effort ({effort:.0f})"


def _default_complaint_result() -> dict:
    return {
        "category": "Other",
        "priority": "Medium",
        "urgency_score": 50.0,
        "resolution_steps": ["Review complaint", "Contact customer"],
        "linked_task_id": None,
        "sla_hours": 8,
    }


def _default_sequence(tasks: list) -> list:
    sorted_tasks = sorted(tasks, key=lambda x: _safe_float(x.get("priority_score", 0), 0.0), reverse=True)
    return [
        {
            "task_id": t.get("id"),
            "sequence": i + 1,
            "reason": "Sorted by priority score",
        }
        for i, t in enumerate(sorted_tasks)
        if t.get("id") is not None
    ]


# ─── FUNCTION 1 — compute_priority_score (ML) ───────────────────────────────

async def compute_priority_score(task_data: dict) -> dict:
    try:
        status = str(task_data.get("status", "")).lower()
        if status == "done":
            return {"score": 0.0, "reasoning": "Task is marked done."}

        cache_key = str(task_data.get("id", task_data.get("title", "unknown")))
        if _is_cache_valid(cache_key):
            return {
                "score": _score_cache[cache_key]["score"],
                "reasoning": _score_cache[cache_key]["reasoning"],
            }

        model = _get_model()
        if model is None:
            raise RuntimeError("priority model not found")

        deadline_days = _derive_deadline_days(task_data)
        effort = _safe_float(task_data.get("effort", 3), 3.0)
        impact = _safe_float(task_data.get("impact", 5), 5.0)
        workload = _safe_float(task_data.get("workload", 5), 5.0)
        complaint_boost = _safe_float(task_data.get("complaint_boost", 0.0), 0.0)

        predicted = float(model.predict([[deadline_days, effort, impact, workload]])[0])
        score = max(0.0, min(100.0, predicted + complaint_boost))
        reasoning = _priority_reasoning(deadline_days, impact, effort, workload, complaint_boost)

        _score_cache[cache_key] = {
            "score": score,
            "reasoning": reasoning,
            "cached_at": datetime.now(timezone.utc),
        }
        return {"score": score, "reasoning": reasoning}
    except Exception:
        return {"score": 50.0, "reasoning": "Score unavailable"}


# ─── FUNCTION 2 — classify_complaint (GROQ) ─────────────────────────────────

async def classify_complaint(text: str, channel: str, available_tasks: list) -> dict:
    try:
        client = _get_groq()
        if client is None:
            return _default_complaint_result()

        task_subset = [{"id": t.get("id"), "title": t.get("title")} for t in available_tasks[:10]]
        valid_task_ids = {t.get("id") for t in task_subset if t.get("id") is not None}

        system = (
            "You are a complaint classification engine. "
            "Respond ONLY with valid JSON. No explanation. No markdown."
        )
        user = f"""
  Classify this customer complaint submitted via {channel}.
  
  Complaint: "{text}"

  Available tasks to potentially link to:
  {task_subset}

  Return ONLY this JSON:
  {{
    "category": "<Product|Packaging|Trade|Process|Other>",
    "priority": "<High|Medium|Low>",
    "urgency_score": <float 0-100>,
    "resolution_steps": ["<step1>", "<step2>", "<step3>"],
    "linked_task_id": <int or null>,
    "sla_hours": <4|8|24>
  }}

  Rules:
  - High priority = customer-blocking or safety issue, urgency 75-100, sla=4
  - Medium = impactful but workaround exists, urgency 40-74, sla=8
  - Low = minor inconvenience, urgency 0-39, sla=24
  - resolution_steps must be 2-4 specific actionable steps, not generic advice
  - linked_task_id must be an id from the available tasks list above, or null
  """

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
            max_tokens=400,
        )
        raw = (response.choices[0].message.content or "").strip()
        parsed = json.loads(_strip_json_fences(raw))

        category = parsed.get("category")
        if category not in {"Product", "Packaging", "Trade", "Process", "Other"}:
            category = "Other"

        priority = parsed.get("priority")
        if priority not in {"High", "Medium", "Low"}:
            priority = "Medium"

        urgency_score = max(0.0, min(100.0, _safe_float(parsed.get("urgency_score", 50.0), 50.0)))

        steps = parsed.get("resolution_steps")
        if not isinstance(steps, list):
            steps = ["Review complaint", "Contact customer"]
        steps = [str(s).strip() for s in steps if str(s).strip()][:4]
        if len(steps) < 2:
            steps = ["Review complaint", "Contact customer"]

        linked_task_id = parsed.get("linked_task_id")
        if linked_task_id not in valid_task_ids:
            linked_task_id = None

        sla_hours = parsed.get("sla_hours")
        if sla_hours not in {4, 8, 24}:
            sla_hours = 4 if priority == "High" else 8 if priority == "Medium" else 24

        return {
            "category": category,
            "priority": priority,
            "urgency_score": urgency_score,
            "resolution_steps": steps,
            "linked_task_id": linked_task_id,
            "sla_hours": sla_hours,
        }
    except Exception:
        return _default_complaint_result()


# ─── FUNCTION 3 — suggest_execution_order (GROQ) ────────────────────────────

async def suggest_execution_order(tasks: list) -> list:
    try:
        filtered_tasks = [t for t in tasks if str(t.get("status", "")).lower() != "done"]
        if len(filtered_tasks) < 2:
            return _default_sequence(filtered_tasks)

        client = _get_groq()
        if client is None:
            return _default_sequence(filtered_tasks)

        user = f"""
  Suggest the optimal execution order for these tasks.

  Tasks:
  {filtered_tasks}

  Return ONLY a JSON array:
  [
    {{"task_id": <int>, "sequence": <int starting 1>, "reason": "<under 10 words>"}},
    ...
  ]

  Rules:
  - High priority_score = do earlier
  - If scores are close, prefer lower effort (quick wins first)
  - Never include tasks with status=done
  - Every active task must appear exactly once in the array
  """

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {
                    "role": "system",
                    "content": "You are a task sequencing engine. Respond only valid JSON array.",
                },
                {"role": "user", "content": user},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        raw = (response.choices[0].message.content or "").strip()
        parsed = json.loads(_strip_json_fences(raw))

        if not isinstance(parsed, list):
            raise ValueError("Groq response is not a list")

        valid_ids = {t.get("id") for t in filtered_tasks if t.get("id") is not None}
        seen = set()
        normalized = []
        for i, item in enumerate(parsed):
            task_id = item.get("task_id") if isinstance(item, dict) else None
            if task_id not in valid_ids or task_id in seen:
                continue
            seen.add(task_id)
            reason = str(item.get("reason", "Sorted by priority score")) if isinstance(item, dict) else "Sorted by priority score"
            normalized.append({
                "task_id": task_id,
                "sequence": i + 1,
                "reason": reason[:120],
            })

        if seen != valid_ids:
            raise ValueError("Groq response missing tasks")

        normalized = sorted(normalized, key=lambda x: x["sequence"])
        return [
            {"task_id": item["task_id"], "sequence": idx + 1, "reason": item["reason"]}
            for idx, item in enumerate(normalized)
        ]
    except Exception:
        filtered_tasks = [t for t in tasks if str(t.get("status", "")).lower() != "done"]
        return _default_sequence(filtered_tasks)
