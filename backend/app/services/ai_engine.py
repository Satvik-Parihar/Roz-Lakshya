"""
AI Engine — Roz-Lakshya Task Prioritization System
====================================================
Uses Groq's FREE inference API (llama-3.3-70b-versatile model) as the LLM backend.
Groq is 100% free to use — sign up at https://console.groq.com to get an API key.

All 3 public functions keep the exact same signatures the routers depend on.
"""

import json
import re
from datetime import datetime, timezone
from app.config import settings

# ─── GROQ CLIENT (uses httpx which is already in requirements.txt) ───────────
import httpx

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Free, fast, high quality — equivalent to Claude 3 Sonnet


def _groq_headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }


async def _call_groq(system: str, user: str, max_tokens: int) -> str:
    """Fire a single Groq API call and return the raw text response."""
    payload = {
        "model": GROQ_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.1,  # Low temp = deterministic, JSON-safe output
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(GROQ_API_URL, headers=_groq_headers(), json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


def _strip_json(raw: str) -> str:
    """Strip markdown fences so json.loads never chokes."""
    return re.sub(r"```(?:json)?|```", "", raw).strip()


# ─── IN-MEMORY SCORE CACHE ───────────────────────────────────────────────────
# key: task_id (str), value: {score, reasoning, cached_at}
_score_cache: dict = {}
CACHE_TTL_SECONDS = 300  # 5-minute TTL before re-scoring


def _is_cache_valid(task_id: str) -> bool:
    if task_id not in _score_cache:
        return False
    cached_at = _score_cache[task_id].get("cached_at")
    if not cached_at:
        return False
    age = (datetime.now(timezone.utc) - cached_at).total_seconds()
    return age < CACHE_TTL_SECONDS


def invalidate_cache(task_id: str) -> None:
    """Force re-score on the next GET — call this after a PATCH."""
    _score_cache.pop(str(task_id), None)


# ─── FUNCTION 1 — compute_priority_score ─────────────────────────────────────

async def compute_priority_score(task_data: dict) -> dict:
    """
    Score a task's priority from 0–100 using the Groq LLM.

    Args:
        task_data: dict with keys title, deadline, effort, impact,
                   complaint_boost, status.
    Returns:
        {"score": float, "reasoning": "one sentence under 15 words"}
    Fallback (any error):
        {"score": 50.0, "reasoning": "Score unavailable"}
    """
    # Use id-based cache key if present, else title-based
    cache_key = str(task_data.get("id", task_data.get("title", "unknown")))
    if _is_cache_valid(cache_key):
        return {
            "score": _score_cache[cache_key]["score"],
            "reasoning": _score_cache[cache_key]["reasoning"],
        }

    try:
        today = datetime.utcnow().isoformat()

        system_prompt = "You are a task prioritization engine. Respond only with valid JSON."

        user_prompt = f"""Score this task's priority from 0 to 100.
Today's date (UTC): {today}

Task:
  Title: {task_data.get("title", "Untitled")}
  Deadline (ISO): {task_data.get("deadline", "No deadline")}
  Effort (1–5, higher = more effort): {task_data.get("effort", 3)}
  Business Impact (1–5, higher = more important): {task_data.get("impact", 3)}
  Status: {task_data.get("status", "todo")}
  Complaint Boost (0–100, already scaled): {task_data.get("complaint_boost", 0.0)}

Scoring rules:
- Higher impact = higher score
- Closer deadline = higher score; overdue tasks must score 90 or above
- Lower effort = slightly higher score (quick wins)
- complaint_boost adds directly to final score
- Tasks with status "done" must always score 0

Return ONLY this JSON, no markdown, no extra text:
{{"score": <float 0-100>, "reasoning": "<one sentence, max 15 words>"}}"""

        raw = await _call_groq(system_prompt, user_prompt, max_tokens=200)
        result = json.loads(_strip_json(raw))

        score = float(max(0.0, min(100.0, result.get("score", 50.0))))
        reasoning = str(result.get("reasoning", "Score computed by AI engine."))

        if str(task_data.get("status", "")).lower() == "done":
            score = 0.0
            reasoning = "Task is marked done."

        _score_cache[cache_key] = {
            "score": score,
            "reasoning": reasoning,
            "cached_at": datetime.now(timezone.utc),
        }
        return {"score": score, "reasoning": reasoning}

    except Exception as e:
        print(f"[AI Engine] compute_priority_score error: {e}")
        return {"score": 50.0, "reasoning": "Score unavailable"}


# ─── FUNCTION 2 — classify_complaint ─────────────────────────────────────────

async def classify_complaint(text: str, channel: str, available_tasks: list) -> dict:
    """
    Classify a complaint using the Groq LLM.

    Args:
        text: raw complaint string
        channel: 'email' | 'call' | 'direct'
        available_tasks: list of dicts with keys id, title
    Returns:
        {
            "category": str,          # Product|Packaging|Trade|Process|Other
            "priority": str,          # High|Medium|Low
            "urgency_score": float,   # 0–100
            "resolution_steps": list, # 2–4 action steps
            "linked_task_id": int|None,
            "sla_hours": int          # 4|8|24
        }
    """
    _fallback = {
        "category": "Other",
        "priority": "Medium",
        "urgency_score": 50.0,
        "resolution_steps": ["Review complaint", "Contact customer"],
        "linked_task_id": None,
        "sla_hours": 8,
    }

    try:
        task_list_str = json.dumps(available_tasks) if available_tasks else "[]"

        system_prompt = "You are a complaint classification engine. Respond only with valid JSON."

        user_prompt = f"""Classify this complaint and recommend resolution.

Complaint: "{text}"
Channel: {channel}

Available tasks (id + title):
{task_list_str}

Rules:
- category must be exactly one of: Product, Packaging, Trade, Process, Other
- priority: High if customer-blocking or safety issue
             Medium if impactful but a workaround exists
             Low if minor inconvenience
- urgency_score: 0–100 (High = 75–100, Medium = 40–74, Low = 0–39)
- resolution_steps: 2 to 4 concrete, actionable steps (not generic advice)
- linked_task_id: the integer id of the most relevant task from the list above, or null
- sla_hours: 4 for High, 8 for Medium, 24 for Low

Return ONLY this JSON, no markdown, no extra text:
{{
  "category": "<Product|Packaging|Trade|Process|Other>",
  "priority": "<High|Medium|Low>",
  "urgency_score": <float 0-100>,
  "resolution_steps": ["<step1>", "<step2>", "<step3>"],
  "linked_task_id": <integer id or null>,
  "sla_hours": <4|8|24>
}}"""

        raw = await _call_groq(system_prompt, user_prompt, max_tokens=500)
        result = json.loads(_strip_json(raw))

        # Validate and clamp
        result["urgency_score"] = float(max(0.0, min(100.0, result.get("urgency_score", 50.0))))
        if result.get("sla_hours") not in [4, 8, 24]:
            result["sla_hours"] = {"High": 4, "Medium": 8, "Low": 24}.get(
                result.get("priority", "Medium"), 8
            )
        if not isinstance(result.get("resolution_steps"), list) or len(result["resolution_steps"]) < 2:
            result["resolution_steps"] = _fallback["resolution_steps"]
        if result.get("category") not in ["Product", "Packaging", "Trade", "Process", "Other"]:
            result["category"] = "Other"
        if result.get("priority") not in ["High", "Medium", "Low"]:
            result["priority"] = "Medium"

        return result

    except Exception as e:
        print(f"[AI Engine] classify_complaint error: {e}")
        return _fallback


# ─── FUNCTION 3 — suggest_execution_order ────────────────────────────────────

async def suggest_execution_order(tasks: list) -> list:
    """
    Suggest the optimal execution order for a list of tasks.

    Args:
        tasks: list of dicts with keys id, title, priority_score,
               deadline, effort, impact, status
    Returns:
        [{"task_id": int, "sequence": int, "reason": "under 10 words"}, ...]
    """
    # Filter out done tasks BEFORE calling LLM
    active_tasks = [t for t in tasks if str(t.get("status", "")).lower() != "done"]

    _fallback = [
        {
            "task_id": t["id"],
            "sequence": i + 1,
            "reason": "Sorted by priority score",
        }
        for i, t in enumerate(
            sorted(active_tasks, key=lambda x: x.get("priority_score", 0), reverse=True)
        )
    ]

    if not active_tasks:
        return []

    try:
        system_prompt = "You are a task sequencing engine. Respond only with valid JSON."

        task_list_str = json.dumps(active_tasks, default=str)

        user_prompt = f"""Suggest the best execution order for these tasks.

Tasks (done tasks already excluded):
{task_list_str}

Sequencing rules:
- High priority_score = do earlier
- If scores are similar, prefer lower effort (quick wins first)
- Group obviously related tasks together
- Never include tasks with status "done" in the output

Return ONLY a JSON array, no markdown, no extra text:
[{{"task_id": <integer>, "sequence": <integer starting from 1>, "reason": "<under 10 words>"}}, ...]"""

        raw = await _call_groq(system_prompt, user_prompt, max_tokens=600)
        result = json.loads(_strip_json(raw))

        if not isinstance(result, list):
            return _fallback

        return result

    except Exception as e:
        print(f"[AI Engine] suggest_execution_order error: {e}")
        return _fallback


# ─── MANUAL TEST CASES (uncomment to run) ────────────────────────────────────

# TEST 1 — compute_priority_score
# sample_task = {
#     "title": "Fix payment gateway timeout",
#     "deadline": "2026-04-21T00:00:00",
#     "effort": 2,
#     "impact": 5,
#     "complaint_boost": 15.0,
#     "status": "todo"
# }
# Expected: score above 75, reasoning mentions deadline or impact

# TEST 2 — classify_complaint
# sample_complaint = "Customer cannot complete checkout, payment fails every time"
# sample_tasks = [{"id": 1, "title": "Fix payment gateway timeout"}]
# Expected: category=Process, priority=High, linked_task_id=1

# TEST 3 — suggest_execution_order
# sample_tasks = [
#     {"id": 1, "title": "Fix login bug", "priority_score": 90.0,
#      "deadline": "2026-04-19", "effort": 2, "impact": 5, "status": "todo"},
#     {"id": 2, "title": "Update docs", "priority_score": 30.0,
#      "deadline": "2026-04-25", "effort": 1, "impact": 2, "status": "todo"},
#     {"id": 3, "title": "Old task", "priority_score": 95.0,
#      "deadline": "2026-04-18", "effort": 3, "impact": 4, "status": "done"}
# ]
# Expected: task 3 filtered out, task 1 appears as sequence 1
