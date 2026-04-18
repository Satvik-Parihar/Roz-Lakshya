import api from './axios';

const mapTask = (task) => ({
  ...task,
  assignee: task.assignee_name || (task.assignee_id ? `User ${task.assignee_id}` : 'Unassigned'),
  reasoning: task.ai_reasoning || task.reasoning || 'Score computed by AI engine.'
});

export const taskApi = {
  getAll: async () => {
    const res = await api.get('/tasks/');
    return { ...res, data: res.data.map(mapTask) };
  },
  create: async (data) => {
    const res = await api.post('/tasks/', data);
    return { ...res, data: mapTask(res.data) };
  },
  update: async (id, data) => {
    const res = await api.patch(`/tasks/${id}`, data);
    return { ...res, data: mapTask(res.data) };
  },
  remove: (id) => api.delete(`/tasks/${id}`),
  
  // Phase 3: AI Sequencing
  getSequence: async (userId) => {
    const res = await api.get(`/tasks/sequence/${userId}`);
    return res;
  }
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
