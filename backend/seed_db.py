import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

load_dotenv()

# Get DB_URL from .env and strip the async driver if present
env_db_url = os.getenv("DATABASE_URL", "postgresql://postgres:Ichigo%402005@localhost:5432/Roz-Lakshya")
DB_URL = env_db_url.replace("+asyncpg", "")

def ensure_database():
    try:
        # Try connecting directly first (Supabase or existing local DB)
        conn = psycopg2.connect(DB_URL)
        conn.close()
        return
    except psycopg2.OperationalError as e:
        if "does not exist" in str(e):
            print(f"Database does not exist. Attempting to create it...")
            # Connect to default postgres to create it
            parsed_url = DB_URL.rsplit('/', 1)
            base_url = parsed_url[0] + "/postgres"
            db_name = parsed_url[1].split('?')[0]  # strip query params if any
            
            try:
                conn = psycopg2.connect(base_url)
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cur = conn.cursor()
                cur.execute(f'CREATE DATABASE "{db_name}"')
                cur.close()
                conn.close()
                print(f"Created database '{db_name}'.")
            except Exception as ex:
                print(f"Warning: Could not create database directly: {ex}")
        else:
            raise e

def main():
    print(f"Connecting to database securely...")
    ensure_database()
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # STEP 1: Create Schema
    print("STEP 1: Creating Schema...")
    cur.execute("""
    -- Drop in reverse dependency order
    DROP TABLE IF EXISTS alerts CASCADE;
    DROP TABLE IF EXISTS complaints CASCADE;
    DROP TABLE IF EXISTS tasks CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('team_member', 'manager', 'teacher')),
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE tasks (
        id SERIAL PRIMARY KEY,
        task_id INTEGER UNIQUE NOT NULL,
        title VARCHAR(255),
        description TEXT,
        assignee_id INTEGER REFERENCES users(id),
        deadline_days INTEGER NOT NULL,
        effort INTEGER NOT NULL CHECK (effort BETWEEN 1 AND 19),
        impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 10),
        workload INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
        priority_score FLOAT NOT NULL,
        priority_label VARCHAR(10) CHECK (priority_label IN ('High', 'Medium', 'Low')),
        complaint_boost FLOAT DEFAULT 0.0,
        ai_reasoning TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE complaints (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        channel VARCHAR(20) DEFAULT 'direct' CHECK (channel IN ('email', 'call', 'direct')),
        category VARCHAR(30) CHECK (category IN ('Product', 'Packaging', 'Trade', 'Process', 'Other')),
        priority VARCHAR(10) CHECK (priority IN ('High', 'Medium', 'Low')),
        urgency_score FLOAT DEFAULT 0.0,
        resolution_steps JSONB,
        linked_task_id INTEGER REFERENCES tasks(id),
        sla_hours INTEGER DEFAULT 24,
        sla_deadline TIMESTAMP,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved')),
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE alerts (
        id SERIAL PRIMARY KEY,
        type VARCHAR(30) NOT NULL CHECK (type IN ('overdue', 'due_soon', 'sla_breach')),
        message TEXT NOT NULL,
        task_id INTEGER REFERENCES tasks(id),
        complaint_id INTEGER REFERENCES complaints(id),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX idx_tasks_priority_score ON tasks(priority_score DESC);
    CREATE INDEX idx_tasks_status ON tasks(status);
    CREATE INDEX idx_tasks_priority_label ON tasks(priority_label);
    CREATE INDEX idx_complaints_status ON complaints(status);
    CREATE INDEX idx_alerts_is_read ON alerts(is_read);
    """)

    # STEP 2: Seed Users
    print("STEP 2: Seeding Users...")
    cur.execute("""
    INSERT INTO users (name, role) VALUES
      ('Ravi Kumar', 'team_member'),
      ('Priya Sharma', 'team_member'),
      ('Ankit Mehta', 'manager'),
      ('Dr. Sunita Rao', 'teacher');
    """)

    # STEP 3: Load CSV
    print("STEP 3: Loading TS-PS13.csv...")
    try:
        df = pd.read_csv('TS-PS13.csv')
        
        def compute_label(score):
            if score > 7: return 'High'
            elif score >= 3: return 'Medium'
            else: return 'Low'
            
        df['priority_label'] = df['priority_label'].fillna(df['priority_score'].apply(compute_label))
        df['assignee_id'] = (df['task_id'] % 4) + 1
        
        rows = [
            (
                int(row['task_id']),
                f"Task #{int(row['task_id'])}",
                None,
                int(row['assignee_id']),
                int(row['deadline_days']),
                int(row['effort']),
                int(row['impact']),
                int(row['workload']),
                'todo',
                float(row['priority_score']),
                str(row['priority_label']),
                0.0,
                None
            )
            for _, row in df.iterrows()
        ]
        
        execute_values(cur, """
            INSERT INTO tasks (
                task_id, title, description, assignee_id,
                deadline_days, effort, impact, workload,
                status, priority_score, priority_label,
                complaint_boost, ai_reasoning
            ) VALUES %s
            ON CONFLICT (task_id) DO NOTHING
        """, rows, page_size=1000)
        
        print(f"Inserted {len(rows)} tasks successfully.")
    except FileNotFoundError:
        print("ERROR: TS-PS13.csv not found in the directory! Please place it here and re-run.")
        conn.commit()
        return

    # STEP 4: Seed Complaints
    print("STEP 4: Seeding Complaints...")
    cur.execute("""
    INSERT INTO complaints (text, channel, category, priority, urgency_score, resolution_steps, linked_task_id, sla_hours, sla_deadline, status)
    VALUES
      ('Customer unable to complete checkout — payment failing repeatedly',
       'call', 'Process', 'High', 85.0,
       '["Escalate to payment gateway team", "Check API error logs", "Issue manual override if needed"]',
       (SELECT id FROM tasks WHERE task_id = 8), 4,
       NOW() + INTERVAL '4 hours', 'open'),
    
      ('Product packaging arrived damaged for bulk order',
       'email', 'Packaging', 'Medium', 55.0,
       '["Contact logistics partner", "Arrange replacement shipment", "Send apology voucher"]',
       (SELECT id FROM tasks WHERE task_id = 33), 8,
       NOW() + INTERVAL '8 hours', 'in-progress'),
    
      ('Trade discount not applied on invoice #4421',
       'direct', 'Trade', 'Low', 30.0,
       '["Pull invoice from ERP", "Apply correct discount tier", "Re-issue invoice"]',
       NULL, 24,
       NOW() + INTERVAL '24 hours', 'open');
    """)
    conn.commit()
    print("Data seeded successfully!")

    # STEP 5: Verification queries
    print("\n--- STEP 5: Verification ---")
    cur.execute("SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'tasks', COUNT(*) FROM tasks UNION ALL SELECT 'complaints', COUNT(*) FROM complaints UNION ALL SELECT 'alerts', COUNT(*) FROM alerts;")
    print("Row Counts:", cur.fetchall())

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
