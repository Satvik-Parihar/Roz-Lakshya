from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    is_admin: bool = False
    must_reset_password: bool = False


class SignupRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    company_domain: Optional[str] = Field(default=None, max_length=255)
    admin_name: str = Field(..., min_length=1, max_length=100)
    admin_email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)


class SignupResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    role: str
    company_name: Optional[str] = None
    is_admin: bool = True


class EmployeeCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    role: str = Field(default="team_member")


class EmployeeCreateResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    temp_password: str
    must_reset_password: bool = True


class PasswordResetRequest(BaseModel):
    old_password: str = Field(..., min_length=8, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class PasswordResetResponse(BaseModel):
    success: bool
    message: str


class UserListItem(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    role: str
    is_admin: bool = False
    company_name: Optional[str] = None
    must_reset_password: bool = False

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
    manual_priority_boost: Optional[float] = Field(default=None, ge=0.0, le=30.0)
    is_pinned: Optional[bool] = None


class TaskPriorityOverride(BaseModel):
    manual_priority_boost: float = Field(0.0, ge=0.0, le=30.0)
    is_pinned: bool = False
    override_reason: Optional[str] = None

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
    manual_priority_boost: float = 0.0
    is_pinned: bool = False
    ai_reasoning: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskSequenceItem(BaseModel):
    task_id: int
    sequence: int
    reason: str

class ComplaintCreate(BaseModel):
    text: str
    channel: str # email | call | direct
    linked_task_id: Optional[int] = None

class ComplaintUpdate(BaseModel):
    status: str # open | in-progress | resolved

class ComplaintResponse(BaseModel):
    id: int
    text: str
    channel: str
    category: Optional[str]
    priority: Optional[str]
    urgency_score: float
    resolution_steps: Optional[list]
    linked_task_id: Optional[int]
    linked_task_number: Optional[int] = None
    linked_member_name: Optional[str] = None
    sla_hours: Optional[int]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
