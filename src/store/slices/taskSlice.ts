import type { SliceCreator, TaskSlice } from '../types';

export const createTaskSlice: SliceCreator<TaskSlice> = (set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  updateTask: (id, patch) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
});
