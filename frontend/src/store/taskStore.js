import { create } from 'zustand';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  setTasks: (tasks) => set({ tasks }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task].sort((a, b) => b.priority_score - a.priority_score),
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks
      .map(t => t.id === id ? { ...t, ...updates } : t)
      .sort((a, b) => b.priority_score - a.priority_score),
  })),

  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== id),
  })),
}));
