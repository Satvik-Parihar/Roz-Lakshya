# 🚀 Roz-Lakshya Developer Guide

Welcome to the development guide for **Roz-Lakshya**! This document will walk you through the project architecture, tech stack, and step-by-step instructions to get the application running locally on your machine.

---

## 🛠 Tech Stack

**Backend:**
- **FastAPI**: High-performance backend framework.
- **PostgreSQL**: Primary database.
- **SQLAlchemy (Async)**: ORM for interacting with the database.
- **Alembic**: Database schema migrations.
- **APScheduler**: Executing background tasks and chron jobs.

**Frontend:**
- **React 18**: UI Library.
- **Vite**: Ultra-fast frontend build tool and bundler.
- **Tailwind CSS 3**: Utility-first CSS framework for rapid UI development.
- **Zustand**: Lightweight global state management.
- **React Router Dom**: Client-side routing.
- **Axios**: Making HTTP requests to the backend API.

---

## 📂 Project Structure

The project is split into two independent domains: `frontend` and `backend`.

```text
Roz-Lakshya/
├── backend/                       # ✅ FastAPI Backend
│   ├── main.py                    # Application entry point & FastAPI instance
│   ├── alembic.ini                # Alembic configuration
│   ├── requirements.txt           # Python dependencies
│   ├── alembic/                   # Database Migration scripts
│   └── app/
│       ├── config.py              # Environment variable parsers (Pydantic settings)
│       ├── database.py            # Async engine and session local setup
│       ├── models.py              # SQLAlchemy DB models (Tables)
│       ├── schemas.py             # Pydantic schemas (Validation & I/O models)
│       ├── routers/               # API Endpoints (separated by domain)
│       └── services/              # Core business logic, AI, and scheduled jobs
│
└── frontend/                      # ✅ React + Vite Frontend
    ├── package.json               # NPM scripts and dependencies
    ├── tailwind.config.js         # Tailwind styling variables and plugins
    └── src/
        ├── main.jsx               # React entry point
        ├── App.jsx                # Global Router setup
        ├── api/                   # Pre-configured Axios instances
        ├── store/                 # Zustand global state (users, etc.)
        └── pages/                 # Full-screen React page components
```

---

## 💻 Local Development Setup

To run this application locally, you will need to open **two terminal windows**: one for the backend, and one for the frontend.

### 1. Backend Setup 🐍

> **Prerequisite:** Ensure you have Python 3.12 or 3.13 installed.

```bash
# 1. Navigate into the backend directory
cd backend

# 2. Create a clean virtual environment
python3.13 -m venv venv

# 3. Activate the virtual environment
# On Mac/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# 4. Install python dependencies
pip install -r requirements.txt

# 5. Setup your local Environment Variables
cp .env.example .env

# 6. Start the server
uvicorn main:app --reload
```
🔥 The backend will now be running on `http://localhost:8000`.
📚 Interactive API Documentation (Swagger) is available at: `http://localhost:8000/docs`.


### 2. Frontend Setup ⚛️

> **Prerequisite:** Ensure you have Node.js (v18+) installed.

```bash
# 1. Navigate into the frontend directory
cd frontend

# 2. Install NPM packages
npm install

# 3. Start the Vite development server
npm run dev
```

⚡️ The frontend will now be running on `http://localhost:5173`.

*The frontend `axios` instance is pre-configured to automatically route API calls to your local backend.*
