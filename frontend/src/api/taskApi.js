import api from './axios';

const VALID_STATUSES = new Set(['todo', 'in-progress', 'done']);

const normalizeStatus = (status) => {
  if (status === undefined || status === null || status === '') return 'todo';
  const normalized = String(status).trim().toLowerCase().replace(/_/g, '-');
  if (normalized === 'inprogress') return 'in-progress';
  return VALID_STATUSES.has(normalized) ? normalized : 'todo';
};

const toBoundedInt = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const toOptionalPositiveInt = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const i = Math.round(n);
  return i > 0 ? i : undefined;
};

const toDeadlineDaysFromDate = (deadline) => {
  if (!deadline) return undefined;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const diffDays = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.min(30, Math.max(1, diffDays));
};

const resolveAssigneeId = (taskLike) => {
  if ('assignee_id' in taskLike) return toOptionalPositiveInt(taskLike.assignee_id);
  if ('assignee' in taskLike) return toOptionalPositiveInt(taskLike.assignee);
  return undefined;
};

const resolveDeadlineDays = (taskLike, fallback) => {
  if ('deadline_days' in taskLike && taskLike.deadline_days !== undefined && taskLike.deadline_days !== null && taskLike.deadline_days !== '') {
    return toBoundedInt(taskLike.deadline_days, 1, 30, fallback);
  }
  if ('deadline' in taskLike) {
    const fromDate = toDeadlineDaysFromDate(taskLike.deadline);
    if (fromDate !== undefined) return fromDate;
  }
  return fallback;
};

const buildCreatePayload = (taskLike) => {
  const payload = {
    title: String(taskLike.title || '').trim(),
    description: taskLike.description ?? undefined,
    assignee_id: resolveAssigneeId(taskLike),
    deadline_days: resolveDeadlineDays(taskLike, 7),
    effort: toBoundedInt(taskLike.effort, 1, 19, 3),
    impact: toBoundedInt(taskLike.impact, 1, 10, 5),
    workload: toBoundedInt(taskLike.workload, 1, 10, 5),
  };

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
};

const buildUpdatePayload = (taskLike) => {
  const payload = {};

  if ('title' in taskLike) payload.title = String(taskLike.title ?? '').trim();
  if ('description' in taskLike) payload.description = taskLike.description ?? null;
  if ('assignee_id' in taskLike) {
    if (taskLike.assignee_id === '' || taskLike.assignee_id === null) {
      payload.assignee_id = null;
    } else {
      const parsedId = toOptionalPositiveInt(taskLike.assignee_id);
      if (parsedId !== undefined) payload.assignee_id = parsedId;
    }
  } else if ('assignee' in taskLike) {
    if (taskLike.assignee === '') {
      payload.assignee_id = null;
    } else {
      const parsedId = toOptionalPositiveInt(taskLike.assignee);
      if (parsedId !== undefined) payload.assignee_id = parsedId;
    }
  }
  if ('deadline_days' in taskLike || 'deadline' in taskLike) payload.deadline_days = resolveDeadlineDays(taskLike, undefined);
  if ('effort' in taskLike) payload.effort = toBoundedInt(taskLike.effort, 1, 19, 3);
  if ('impact' in taskLike) payload.impact = toBoundedInt(taskLike.impact, 1, 10, 5);
  if ('workload' in taskLike) payload.workload = toBoundedInt(taskLike.workload, 1, 10, 5);
  if ('status' in taskLike) payload.status = normalizeStatus(taskLike.status);

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
};

const mapTask = (task) => ({
  ...task,
  status: normalizeStatus(task.status),
  workload: Number(task.workload ?? 5),
  deadline_days: Number(task.deadline_days ?? 7),
  assignee: task.assignee_name || (task.assignee_id ? `User ${task.assignee_id}` : 'Unassigned'),
  reasoning: task.ai_reasoning || task.reasoning || 'Score computed by AI engine.'
});

export const taskApi = {
  getAll: async () => {
    const res = await api.get('/tasks/');
    return { ...res, data: res.data.map(mapTask) };
  },
  create: async (data) => {
    const res = await api.post('/tasks/', buildCreatePayload(data));
    return { ...res, data: mapTask(res.data) };
  },
  update: async (id, data) => {
    const res = await api.patch(`/tasks/${id}`, buildUpdatePayload(data));
    return { ...res, data: mapTask(res.data) };
  },
  remove: (id) => api.delete(`/tasks/${id}`),
  
  // Phase 3: AI Sequencing
  getSequence: async (userId) => {
    const res = await api.get(`/tasks/sequence/${userId}`);
    return res;
  }
};

export const usersApi = {
  getAll: (limit = 500) => api.get(`/users/?limit=${limit}`),
};

export const complaintApi = {
  create: async (data) => {
    const res = await api.post('/complaints/', data);
    return res;
  },
  getAll: async () => {
    const res = await api.get('/complaints/');
    return res;
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/complaints/${id}/status`, { status });
    return res;
  }
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getWorkload: (groupBy = 'department') => api.get(`/dashboard/workload?group_by=${groupBy}`),
  getBottlenecks: () => api.get('/dashboard/bottlenecks'),
  getDepartments: () => api.get('/dashboard/departments'),
};

export const alertsApi = {
  getActive: () => api.get('/alerts/active'),
  markRead: (id) => api.patch(`/alerts/${id}/read`),
  markAllRead: () => api.patch('/alerts/read-all'),
};
