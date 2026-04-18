from app.models import Task

def compute_priority_score(task: Task) -> tuple[float, str]:
    """
    Returns (score: float, reasoning: str)
    Stub uses simple formula until P2 plugs in Claude API.
    """
    try:
        score = (task.impact * 10) / max(task.effort, 1) + (10 / max(task.deadline_days, 1))
        reasoning = f"Stub score: impact={task.impact}, effort={task.effort}, deadline={task.deadline_days}d"
        return round(score, 2), reasoning
    except Exception:
        return 50.0, "Fallback score — AI engine unavailable"
