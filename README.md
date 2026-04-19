# Roz-Lakshya

<p align="center">
    <strong>AI-assisted task prioritization and complaint intelligence platform</strong><br/>
    <em>FastAPI + PostgreSQL + React + Zustand</em>
</p>

<p align="center">
    <img alt="Frontend" src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=white" />
    <img alt="Backend" src="https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white" />
    <img alt="Database" src="https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white" />
    <img alt="State" src="https://img.shields.io/badge/State-Zustand-000000" />
    <img alt="Routing" src="https://img.shields.io/badge/Routing-React%20Router-CA4245?logo=reactrouter&logoColor=white" />
</p>

Roz-Lakshya helps teams:
- create and track operational tasks,
- re-prioritize work dynamically using AI scoring,
- link complaints to tasks and automatically raise urgency,
- monitor execution health through dashboards and alerting.

---

## Table of Contents
- Why Roz-Lakshya
- Product Features
- System Architecture
- Setup Flow Diagram
- Tech Stack
- Repository Layout
- Environment Variables
- Quick Start
- Detailed Setup (Windows / macOS / Linux)
- How the System Works
- Role-Based Walkthroughs
- API Surface (By Module)
- Frontend Data Model
- Operational Notes and Performance
- Troubleshooting Guide
- Scripts and Commands
- Contribution Guidelines

## Why Roz-Lakshya
Operational teams often suffer from static priority queues that do not react to real-world pressure:
- customer complaints arrive but priority boards remain unchanged,
- deadlines move while task scores stay stale,
- leadership lacks a live, role-aware snapshot of execution risk.

Roz-Lakshya addresses this by combining:
- dynamic scoring,
- complaint-driven urgency boosts,
- admin overrides,
- structured operational analytics.

## Product Features

### Task Intelligence
- AI/ML-backed task scoring.
- High/Medium/Low labels derived from score.
- Dynamic re-score on updates.
- Admin pin and manual boost support.

### Complaint Engine
- Complaint intake via Email, Call, Direct channel.
- Classification with urgency and SLA.
- Optional task linking.
- Automatic complaint boost applied to linked task priority.

### Dashboard Analytics
- KPI summary cards.
- Workload by department or user.
- Bottleneck and overdue analysis.
- Operational notes generation.

### Auth and Access
- Company admin signup.
- Employee provisioning by admin.
- Password reset enforcement.
- Role-aware endpoint access.

---

## System Architecture

```mermaid
flowchart LR
        A[React SPA - Vite] -->|Axios + JWT| B[FastAPI /api/v1]
        B --> C[Users Router]
        B --> D[Tasks Router]
        B --> E[Complaints Router]
        B --> F[Dashboard Router]
        B --> G[Alerts Router]
        D --> H[AI Engine - scoring + sequencing]
        E --> H
        F --> H
        B --> I[(PostgreSQL)]
```

## Setup Flow Diagram

```mermaid
flowchart TD
        A[Clone Repo] --> B[Configure Backend .env]
        B --> C[Install Backend Dependencies]
        C --> D[Run FastAPI on 127.0.0.1:8000]
        A --> E[Install Frontend Dependencies]
        E --> F[Run Vite on localhost:5173]
        D --> G[Login from Frontend]
        F --> G
        G --> H[Task Board + Dashboard + Complaints Live]
```

---

## Tech Stack

### Backend
- FastAPI
- SQLAlchemy Async + asyncpg
- PostgreSQL
- Pydantic / pydantic-settings
- Alembic
- APScheduler (toggleable)
- Groq (optional)
- scikit-learn + joblib (priority model)

### Frontend
- React
- Vite
- React Router
- Zustand
- Axios
- Tailwind CSS
- Recharts

---

## Repository Layout

```text
Roz-Lakshya/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   ├── app/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── security.py
│   │   ├── routers/
│   │   │   ├── users.py
│   │   │   ├── tasks.py
│   │   │   ├── complaints.py
│   │   │   ├── dashboard.py
│   │   │   └── alerts.py
│   │   └── services/
│   │       ├── ai_engine.py
│   │       └── scheduler.py
│   └── .env.example
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── api/
│       ├── store/
│       ├── components/
│       └── pages/
└── README.md
```

---

## Environment Variables

Backend reads from backend/.env.

| Variable | Required | Default | Description |
|---|---|---|---|
| DATABASE_URL | Yes | postgresql+asyncpg://postgres:password@localhost:5432/ts13_db | Async PostgreSQL connection string |
| ENVIRONMENT | No | development | Runtime profile |
| SQL_ECHO | No | false | SQLAlchemy SQL logging |
| CORS_ORIGINS | No | ["http://localhost:5173"] | Allowed origins |
| JWT_SECRET_KEY | Yes in production | change-me-in-production | JWT signing secret |
| JWT_ALGORITHM | No | HS256 | JWT algorithm |
| JWT_ACCESS_TOKEN_EXPIRE_MINUTES | No | 60 | Access token expiry |
| GROQ_API_KEY | Optional | empty | Optional LLM provider key |
| ENABLE_SCHEDULER | No | false | Enables periodic jobs |

Frontend variable:
- VITE_API_URL (optional). If omitted, app uses http://127.0.0.1:8000/api/v1 with built-in fallback behavior for local recovery.

---

## Quick Start

### 1) Backend
```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2) Frontend
```powershell
cd frontend
npm install
npm run dev
```

### 3) Open
- Frontend: http://localhost:5173
- Backend docs: http://127.0.0.1:8000/docs

---

## Detailed Setup (Windows / macOS / Linux)

### Windows (PowerShell)
```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env

cd ..\frontend
npm install
```

### macOS / Linux
```bash
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

cd ../frontend
npm install
```

---

## How the System Works

### Task Scoring Lifecycle
1. Task created by admin with effort, impact, deadline, workload.
2. Backend computes score and label.
3. Updates trigger re-score.
4. Complaint boosts and admin overrides affect final priority.

### Complaint Impact Lifecycle
1. Complaint submitted.
2. Classified with category, urgency, SLA.
3. Optional task linked.
4. Linked task complaint_boost increases.
5. Task re-scored immediately.

### Dashboard Lifecycle
1. Dashboard requests summary/workload/bottlenecks/departments/notes.
2. Backend aggregates recent scoped window.
3. Frontend renders cards and charts with graceful partial-failure handling.

---

## Role-Based Walkthroughs

### Admin Walkthrough

#### Step 1: Login
```http
POST /api/v1/users/login
Content-Type: application/json

{
    "email": "admin@company.com",
    "password": "Admin@12345"
}
```

Expected response (example):
```json
{
    "access_token": "<jwt>",
    "user_id": 101,
    "role": "admin",
    "is_admin": true,
    "must_reset_password": false
}
```

#### Step 2: Create Employee
```http
POST /api/v1/users/employees
Authorization: Bearer <jwt>
Content-Type: application/json

{
    "name": "Akash Sharma",
    "email": "akash@company.com",
    "role": "team_member"
}
```

#### Step 3: Create Task
```http
POST /api/v1/tasks/
Authorization: Bearer <jwt>
Content-Type: application/json

{
    "title": "Resolve distributor invoice mismatch",
    "description": "Mismatch in GST lines for Q2 invoices",
    "assignee_id": 145,
    "deadline_days": 3,
    "effort": 5,
    "impact": 8,
    "workload": 6
}
```

#### Step 4: Override Priority (optional)
```http
POST /api/v1/tasks/321/override
Authorization: Bearer <jwt>
Content-Type: application/json

{
    "manual_priority_boost": 15,
    "is_pinned": true,
    "override_reason": "Board-level critical escalation"
}
```

### Employee Walkthrough

#### Step 1: Login
```http
POST /api/v1/users/login
```

#### Step 2: Update Own Task Status
```http
PATCH /api/v1/tasks/321
Authorization: Bearer <jwt>
Content-Type: application/json

{
    "status": "in-progress"
}
```

#### Step 3: Submit Complaint
```http
POST /api/v1/complaints/
Authorization: Bearer <jwt>
Content-Type: application/json

{
    "text": "Customer reports damaged cartons in latest shipment",
    "channel": "call",
    "linked_task_id": 321
}
```

Expected behavior:
- complaint appears in recent complaints,
- linked task score is recalculated,
- dashboard reflects revised risk profile.

---

## API Surface (By Module)
Base prefix: /api/v1

### Users
- POST /users/signup
- POST /users/login
- POST /users/reset-password
- GET /users/me
- GET /users/
- GET /users/admins
- POST /users/employees
- GET /users/bootstrap-status

### Tasks
- POST /tasks/
- GET /tasks/
- PATCH /tasks/{task_id}
- POST /tasks/{task_id}/override
- DELETE /tasks/{task_id}
- GET /tasks/my/{user_id}
- GET /tasks/score/{task_id}
- GET /tasks/sequence/{user_id}

### Complaints
- POST /complaints/
- GET /complaints/
- PATCH /complaints/{id}/status

### Dashboard
- GET /dashboard/summary
- GET /dashboard/workload
- GET /dashboard/bottlenecks
- GET /dashboard/departments
- GET /dashboard/operational-notes

### Alerts
- GET /alerts/active
- PATCH /alerts/read-all
- PATCH /alerts/{alert_id}/read
- POST /alerts/trigger-check

---

## Frontend Data Model

### API Layer
- frontend/src/api/axios.js
- frontend/src/api/taskApi.js

### Stores
- frontend/src/store/useTaskStore.js

### Main Pages
- frontend/src/pages/Dashboard.jsx
- frontend/src/pages/TaskBoard.jsx
- frontend/src/pages/ComplaintEngine.jsx
- frontend/src/pages/ExecutionSequence.jsx

### Header and Auth Experience
- frontend/src/components/PriorityHeader.jsx
- Role-aware identity control (Admin/Employee)
- Dropdown with profile and logout actions

---

## Operational Notes and Performance
- Query windows are intentionally bounded to reduce load.
- Scheduler is toggleable and disabled by default for development.
- Keep task fetch limits moderate in UI.
- Ensure indexes exist in production environments.
- Startup migration warnings can indicate table locks in shared DB instances.

---

## Troubleshooting Guide

### A) Unauthorized errors in browser console
Symptoms:
- 401/403 on dashboard or task requests.

Checks:
1. Re-login and ensure token is fresh.
2. Complete reset-password flow if required.
3. Confirm Authorization header is present in requests.

### B) Port already in use (Windows 10048)
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### C) API timeout or 500 due to DB lock/timeout
Symptoms:
- requests hang,
- startup logs mention lock timeout or statement timeout.

Checks:
1. Validate DB connectivity with simple select 1.
2. Keep ENABLE_SCHEDULER=false for dev.
3. Restart backend after lock contention clears.

### D) Frontend loads skeletons but no cards
Checks:
1. Open network tab and inspect failed API path.
2. Confirm backend route works via Swagger.
3. Verify user role and company scope have data.

---

## Scripts and Commands

### Backend
```powershell
python -m compileall app main.py
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend
```powershell
npm run dev
npm run build
npm run preview
npm run lint
```

---

## Contribution Guidelines
1. Create a feature branch from dev-v1.0.
2. Keep endpoint contracts stable.
3. Validate frontend build and backend compile before PR.
4. Update this README whenever behavior or setup changes.
5. Prefer small, reviewable commits.

---

If setup fails in a new environment, start with Troubleshooting, then inspect backend logs and DB timeouts before debugging frontend rendering.
