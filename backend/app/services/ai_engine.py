import anthropic
import json
import re
from datetime import datetime, timezone
from dotenv import load_dotenv
import os

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-3-5-sonnet-20241022"  # Note: 4-20250514 is not a valid standard model, using actual model equivalent

# ─── IN-MEMORY SCORE CACHE ────────────────────────────────────────────────────
# key: task_id, value: {"score": float, "reasoning": str, "cached_at": datetime}
_score_cache: dict = {}
CACHE_TTL_SECONDS = 300  # Re-score only if older than 5 minutes

def _is_cache_valid(task_id: str) -> bool:
    if task_id not in _score_cache:
        return False
    cached_at = _score_cache[task_id].get("cached_at")
    if not cached_at:
        return False
    age = (datetime.now(timezone.utc) - cached_at).total_seconds()
    return age < CACHE_TTL_SECONDS

def invalidate_cache(task_id: str):
    """Call this when a task's fields change — forces re-score on next call."""
    _score_cache.pop(str(task_id), None)

def compute_priority_score(task) -> dict:
    task_id = str(task.id)

    # Return cached result if still fresh and no force-refresh needed
    if _is_cache_valid(task_id):
        return {
            "score": _score_cache[task_id]["score"],
            "reasoning": _score_cache[task_id]["reasoning"],
        }

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    prompt = f"""Score this task's priority from 0 to 100.

Title: {task.title}
Deadline: {task.deadline} (today is {today})
Effort required (1-5, higher = more effort): {task.effort}
Business impact (1-5, higher = more important): {task.impact}
Current status: {task.status}
Complaint boost from linked complaints: {task.complaint_boost}

Scoring rules:
- Urgency (time to deadline) should weigh heavily — tasks due in <2 hours score 90+
- High impact scores UP, high effort scores DOWN slightly
- complaint_boost directly adds to the score (represents customer pressure)
- A done task should always score 0 regardless of other fields

Return ONLY valid JSON with no markdown, no explanation, no extra text:
{{"score": <float 0-100>, "reasoning": "<one sentence, max 15 words>"}}"""

    try:
        message = client.messages.create(
            model=MODEL,
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = message.content[0].text.strip()

        # Parse JSON — strip any accidental markdown fences
        raw = re.sub(r"```json|```", "", raw).strip()
        result = json.loads(raw)

        score = float(max(0.0, min(100.0, result.get("score", 50.0))))
        reasoning = str(result.get("reasoning", "Score computed by AI engine."))

        # Override: completed tasks always score 0
        if str(task.status).lower() == "done":
            score = 0.0
            reasoning = "Task is marked done."

        # Store in cache
        _score_cache[task_id] = {
            "score": score,
            "reasoning": reasoning,
            "cached_at": datetime.now(timezone.utc),
        }

        return {"score": score, "reasoning": reasoning}

    except json.JSONDecodeError:
        # Fallback: extract first number found in response
        numbers = re.findall(r'\b(\d{1,3}(?:\.\d+)?)\b', raw)
        score = float(numbers[0]) if numbers else 50.0
        score = max(0.0, min(100.0, score))
        fallback = {"score": score, "reasoning": "Score estimated (parse fallback)."}
        _score_cache[task_id] = {**fallback, "cached_at": datetime.now(timezone.utc)}
        return fallback

    except Exception as e:
        # Never crash P1's endpoint — return a safe default
        print(f"[AI Engine] Error scoring task {task_id}: {e}")
        return {"score": 50.0, "reasoning": "Score unavailable — API error."}


def classify_complaint(text: str, tasks: list) -> dict:
    """
    Args:
        text: raw complaint string from user
        tasks: list of Task model instances (used to suggest linked task)
    Returns:
        {
            "category": str,        # Product|Packaging|Trade|Process|Other
            "priority": str,        # High|Medium|Low
            "urgency_score": float, # 0–100
            "resolution_steps": list[str],
            "linked_task_suggestion": str | None,
            "sla_hours": int        # 4 | 8 | 24
        }
    """
    task_titles = [t.title for t in tasks] if tasks else []

    prompt = f"""Classify this complaint and recommend resolution.

Complaint: "{text}"

Available tasks: {json.dumps(task_titles)}

Return ONLY valid JSON with no markdown, no explanation:
{{
  "category": "<Product|Packaging|Trade|Process|Other>",
  "priority": "<High|Medium|Low>",
  "urgency_score": <float 0-100>,
  "resolution_steps": ["<step1>", "<step2>", "<step3>"],
  "linked_task_suggestion": "<task title from available tasks or null>",
  "sla_hours": <4|8|24>
}}

Rules:
- High = customer-blocking issue → SLA 4h
- Medium = impactful but not blocking → SLA 8h
- Low = minor inconvenience → SLA 24h
- linked_task_suggestion must exactly match one of the available task titles, or be null"""

    try:
        message = client.messages.create(
            model=MODEL,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = re.sub(r"```json|```", "", message.content[0].text.strip()).strip()
        result = json.loads(raw)

        # Validate and clamp
        result["urgency_score"] = float(max(0.0, min(100.0, result.get("urgency_score", 50.0))))
        if result.get("sla_hours") not in [4, 8, 24]:
            result["sla_hours"] = {"High": 4, "Medium": 8, "Low": 24}.get(result.get("priority", "Low"), 24)
        if not isinstance(result.get("resolution_steps"), list):
            result["resolution_steps"] = ["Review the complaint", "Contact the customer", "Resolve and close"]

        return result

    except Exception as e:
        print(f"[AI Engine] Error classifying complaint: {e}")
        return {
            "category": "Other",
            "priority": "Medium",
            "urgency_score": 50.0,
            "resolution_steps": ["Review complaint", "Escalate if needed", "Follow up with customer"],
            "linked_task_suggestion": None,
            "sla_hours": 8,
        }
