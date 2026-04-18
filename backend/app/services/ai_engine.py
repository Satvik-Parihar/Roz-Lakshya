"""
Mock AI Engine — Roz-Lakshya Task Prioritization System
=======================================================
This engine uses static/deterministic logic instead of real LLM calls.
All references to third-party AI providers (Groq/Claude) have been removed.
"""

import json
from datetime import datetime, timezone, timedelta

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


# ─── FUNCTION 1 — compute_priority_score (STATIC) ───────────────────────────

async def compute_priority_score(task_data: dict) -> dict:
    """
    Deterministically calculates a priority score based on task fields.
    """
    cache_key = str(task_data.get("id", task_data.get("title", "unknown")))
    if _is_cache_valid(cache_key):
        return {
            "score": _score_cache[cache_key]["score"],
            "reasoning": _score_cache[cache_key]["reasoning"],
        }

    # Base Score Calculation
    impact = float(task_data.get("effort", 3))
    effort = float(task_data.get("effort", 3))
    boost = float(task_data.get("complaint_boost", 0.0))
    status = str(task_data.get("status", "")).lower()

    if status == "done":
        return {"score": 0.0, "reasoning": "Task is marked done."}

    # Simple heuristic: Impact increases score, high effort slightly decreases, boost adds.
    # We also simulate urgency if the title contains words like "Urgent" or "Fix"
    base = (impact * 15) - (effort * 2) + boost
    
    title = str(task_data.get("title", "")).lower()
    if any(word in title for word in ["fix", "urgent", "error", "broken", "fail"]):
        base += 20
        reasoning = "High priority due to critical nature of task."
    elif impact > 4:
        reasoning = "Heavily weighted due to high business impact."
    else:
        reasoning = "Standard priority based on workload and effort."

    score = max(0.0, min(100.0, base))

    _score_cache[cache_key] = {
        "score": score,
        "reasoning": reasoning,
        "cached_at": datetime.now(timezone.utc),
    }
    return {"score": score, "reasoning": reasoning}


# ─── FUNCTION 2 — classify_complaint (STATIC) ───────────────────────────────

async def classify_complaint(text: str, channel: str, available_tasks: list) -> dict:
    """
    Returns a static classification based on keywords in the text.
    """
    text_lower = text.lower()
    
    # Static Category Matching
    category = "Other"
    if any(w in text_lower for w in ["product", "item", "quality"]): category = "Product"
    elif any(w in text_lower for w in ["package", "box", "shipping"]): category = "Packaging"
    elif any(w in text_lower for w in ["trade", "vendor", "distributor"]): category = "Trade"
    elif any(w in text_lower for w in ["process", "step", "flow"]): category = "Process"

    # Static Priority Matching
    priority = "Low"
    urgency_score = 30.0
    if any(w in text_lower for w in ["urgent", "fail", "broken", "stop", "illegal"]):
        priority = "High"
        urgency_score = 90.0
    elif any(w in text_lower for w in ["delayed", "slow", "error"]):
        priority = "Medium"
        urgency_score = 60.0

    # Static Linking (find the first task that shares a word with complaint)
    linked_task_id = None
    if available_tasks:
        words = [w for w in text_lower.split() if len(w) > 4]
        for t in available_tasks:
            if any(w in t.get("title", "").lower() for w in words):
                linked_task_id = t.get("id")
                break

    return {
        "category": category,
        "priority": priority,
        "urgency_score": urgency_score,
        "resolution_steps": [
            f"Review registered {category} complaint",
            "Investigate root cause from user feedback",
            "Contact customer for additional details",
            "Resolve and update status"
        ],
        "linked_task_id": linked_task_id,
        "sla_hours": 4 if priority == "High" else 8 if priority == "Medium" else 24
    }


# ─── FUNCTION 3 — suggest_execution_order (STATIC) ──────────────────────────

async def suggest_execution_order(tasks: list) -> list:
    """
    Suggests an order based simply on priority_score descending.
    """
    active_tasks = [t for t in tasks if str(t.get("status", "")).lower() != "done"]
    sorted_tasks = sorted(active_tasks, key=lambda x: x.get("priority_score", 0), reverse=True)
    
    result = []
    for i, t in enumerate(sorted_tasks):
        result.append({
            "task_id": t["id"],
            "sequence": i + 1,
            "reason": "Sorted by combined priority score"
        })
    return result
