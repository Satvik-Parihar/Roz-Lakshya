import { create } from 'zustand';
import { taskApi } from '../api/taskApi';

const TASK_CACHE_TTL_MS = 90 * 1000;
let inFlightFetchPromise = null;

const sortByPriority = (tasks) =>
  [...tasks].sort((a, b) => {
    const pinDelta = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned));
    if (pinDelta !== 0) return pinDelta;
    return (b.priority_score ?? 0) - (a.priority_score ?? 0);
  });

const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  lastFetchedAt: 0,
  lastFetchLimit: 0,

  fetchTasks: async (options = {}) => {
    const { force = false, limit = 300 } = options;
    const state = get();
    const now = Date.now();

    if (!force && inFlightFetchPromise) {
      return inFlightFetchPromise;
    }

    const isFresh =
      !force
      && state.tasks.length > 0
      && state.lastFetchLimit === limit
      && now - Number(state.lastFetchedAt || 0) < TASK_CACHE_TTL_MS;

    if (isFresh) {
      return state.tasks;
    }

    set({ loading: true, error: null });

    inFlightFetchPromise = (async () => {
      try {
        const res = await taskApi.getAll(limit);
        const sorted = sortByPriority(res.data);
        set({
          tasks: sorted,
          loading: false,
          lastFetchedAt: Date.now(),
          lastFetchLimit: limit,
        });
        return sorted;
      } catch (err) {
        const timeoutError = err?.code === 'ECONNABORTED' ? 'Request timed out while loading tasks' : null;
        const networkError = !err?.response ? 'Unable to reach backend server' : null;
        set({
          error: timeoutError || err?.response?.data?.detail || networkError || 'Failed to load tasks',
          loading: false,
        });
        return [];
      } finally {
        inFlightFetchPromise = null;
      }
    })();

    return inFlightFetchPromise;
  },

  createTask: async (data) => {
    const res = await taskApi.create(data);
    set((state) => ({
      tasks: sortByPriority([...state.tasks, res.data]),
      lastFetchedAt: Date.now(),
    }));
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
        lastFetchedAt: Date.now(),
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
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id), lastFetchedAt: Date.now() }));
    try {
      await taskApi.remove(id);
    } catch (err) {
      set({ tasks: previous });
      throw err;
    }
  },
}));

export default useTaskStore;
