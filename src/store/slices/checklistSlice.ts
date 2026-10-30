import type { ChecklistSlice, SliceCreator } from '../types';

export const createChecklistSlice: SliceCreator<ChecklistSlice> = (set) => ({
  checklist: [],
  setChecklist: (checklist) => set({ checklist }),
  toggleChecklistItem: (id) =>
    set((s) => ({
      checklist: s.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    })),
});
