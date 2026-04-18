import { create } from 'zustand';
import { taskApi } from '../api/taskApi';

const sortByPriority = (tasks) =>
  [...tasks].sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await taskApi.getAll();
      set({ tasks: sortByPriority(res.data), loading: false });
    } catch (err) {
      set({ error: err?.response?.data?.detail ?? 'Failed to load tasks', loading: false });
    }
  },

  createTask: async (data) => {
    const res = await taskApi.create(data);
    set((state) => ({ tasks: sortByPriority([...state.tasks, res.data]) }));
    return res.data;
  },

  updateTask: async (id, data) => {
    // Optimistic update
    set((state) => ({
      tasks: sortByPriority(
        state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t))
      ),
    }));
    try {
      const res = await taskApi.update(id, data);
      set((state) => ({
        tasks: sortByPriority(
          state.tasks.map((t) => (t.id === id ? res.data : t))
        ),
      }));
      return res.data;
    } catch (err) {
      // Revert on failure
      await get().fetchTasks();
      throw err;
    }
  },

  deleteTask: async (id) => {
    // Optimistic delete
    const previous = get().tasks;
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    try {
      await taskApi.remove(id);
    } catch (err) {
      set({ tasks: previous });
      throw err;
    }
  },
}));

export default useTaskStore;
