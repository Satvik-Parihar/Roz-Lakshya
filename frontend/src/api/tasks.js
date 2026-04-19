import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── MOCK DATA (use until backend is live) ──────────────────────────────────
const MOCK_TASKS = [
  {
    id: '1', title: 'Fix login redirect bug', assignee: 'Alice',
    deadline: '2025-01-15T10:00:00', effort: 2, impact: 5,
    status: 'in-progress', priority_score: 88.4,
    complaint_boost: 15.0,
    reasoning: 'High impact + imminent deadline + complaint boost from 2 linked complaints.',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: '2', title: 'Update API documentation', assignee: 'Bob',
    deadline: '2025-01-20T17:00:00', effort: 3, impact: 2,
    status: 'todo', priority_score: 34.1,
    complaint_boost: 0,
    reasoning: 'Low urgency. Deadline is comfortable, low business impact.',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: '3', title: 'Integrate payment gateway', assignee: 'Alice',
    deadline: '2025-01-16T12:00:00', effort: 5, impact: 5,
    status: 'todo', priority_score: 76.2,
    complaint_boost: 0,
    reasoning: 'Critical business feature. High effort but cannot be deferred.',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
];

// ─── TOGGLE THIS to switch from mock → live ──────────────────────────────────
const USE_MOCK = false;   // ← Set to false once P1 backend endpoints are live

// ─── API FUNCTIONS ───────────────────────────────────────────────────────────
export const fetchTasks = async (userId = null) => {
  if (USE_MOCK) return [...MOCK_TASKS];
  const url = userId ? `${BASE_URL}/tasks/my/${userId}` : `${BASE_URL}/tasks`;
  const { data } = await axios.get(url);
  // Map backend JSON to P3/P4's expected keys
  return data.map(task => ({
    ...task,
    assignee: task.assignee_name || `User ${task.assignee_id}`,
    reasoning: task.ai_reasoning || task.reasoning
  }));
};

export const createTask = async (taskData) => {
  if (USE_MOCK) {
    const newTask = {
      ...taskData, id: Date.now().toString(),
      priority_score: Math.floor(Math.random() * 100 * 10) / 10,
      complaint_boost: 0,
      reasoning: 'Score computed by AI engine.',
      status: 'todo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_TASKS.push(newTask);
    return newTask;
  }
  const { data } = await axios.post(`${BASE_URL}/tasks/`, taskData);
  return {
    ...data,
    assignee: data.assignee_name || `User ${data.assignee_id}`,
    reasoning: data.ai_reasoning || data.reasoning
  };
};

export const updateTask = async (id, updates) => {
  if (USE_MOCK) {
    const task = MOCK_TASKS.find(t => t.id === id);
    if (task) Object.assign(task, updates, { updated_at: new Date().toISOString() });
    return { ...task };
  }
  const { data } = await axios.patch(`${BASE_URL}/tasks/${id}`, updates);
  return {
    ...data,
    assignee: data.assignee_name || `User ${data.assignee_id}`,
    reasoning: data.ai_reasoning || data.reasoning
  };
};

export const deleteTask = async (id) => {
  if (USE_MOCK) {
    const idx = MOCK_TASKS.findIndex(t => t.id === id);
    if (idx > -1) MOCK_TASKS.splice(idx, 1);
    return { success: true };
  }
  await axios.delete(`${BASE_URL}/tasks/${id}`);
  return { success: true };
};
