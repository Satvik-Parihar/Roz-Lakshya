from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    deadline_days: int = Field(..., ge=1, le=30)
    effort: int = Field(..., ge=1, le=19)
    impact: int = Field(..., ge=1, le=10)
    workload: int = Field(..., ge=1, le=10)

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    deadline_days: Optional[int] = None
    effort: Optional[int] = None
    impact: Optional[int] = None
    workload: Optional[int] = None
    status: Optional[str] = None  # todo | in-progress | done

class TaskResponse(BaseModel):
    id: int
    task_id: int
    title: Optional[str]
    description: Optional[str]
    assignee_id: Optional[int]
    assignee_name: Optional[str]
    deadline_days: int
    deadline: Optional[datetime]
    effort: int
    impact: int
    workload: int
    status: str
    priority_score: float
    priority_label: Optional[str]
    complaint_boost: float
    ai_reasoning: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
