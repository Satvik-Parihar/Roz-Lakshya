from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=func.now())
    
    tasks = relationship("Task", back_populates="assignee")

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, unique=True, nullable=False)
    title = Column(String(255))
    description = Column(Text)
    assignee_id = Column(Integer, ForeignKey('users.id'))
    deadline_days = Column(Integer, nullable=False)
    effort = Column(Integer, nullable=False)
    impact = Column(Integer, nullable=False)
    workload = Column(Integer, nullable=False)
    status = Column(String(20), default='todo')
    priority_score = Column(Float, nullable=False)
    priority_label = Column(String(10))
    complaint_boost = Column(Float, default=0.0)
    ai_reasoning = Column(Text)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    assignee = relationship("User", back_populates="tasks")

class Complaint(Base):
    __tablename__ = 'complaints'
    id = Column(Integer, primary_key=True)
    text = Column(Text, nullable=False)
    channel = Column(String(20), default='direct')
    category = Column(String(30))
    priority = Column(String(10))
    urgency_score = Column(Float, default=0.0)
    resolution_steps = Column(JSON)
    linked_task_id = Column(Integer, ForeignKey('tasks.id'))
    sla_hours = Column(Integer, default=24)
    sla_deadline = Column(DateTime)
    status = Column(String(20), default='open')
    created_at = Column(DateTime, default=func.now())

class Alert(Base):
    __tablename__ = 'alerts'
    id = Column(Integer, primary_key=True)
    type = Column(String(30), nullable=False)
    message = Column(Text, nullable=False)
    task_id = Column(Integer, ForeignKey('tasks.id'))
    complaint_id = Column(Integer, ForeignKey('complaints.id'))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
