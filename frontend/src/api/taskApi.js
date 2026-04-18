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
};

