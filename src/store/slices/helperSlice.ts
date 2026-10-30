import type { HelperSlice, SliceCreator } from '../types';
import { upsertById } from './upsert';

export const createHelperSlice: SliceCreator<HelperSlice> = (set) => ({
  helpers: [],
  upsertHelper: (helper) => set((s) => ({ helpers: upsertById(s.helpers, helper) })),
  removeHelper: (id) =>
    set((s) => ({
      helpers: s.helpers.filter((h) => h.id !== id),
      // Unassign the removed helper everywhere so no task or cue points at a ghost.
      tasks: s.tasks.map((t) => (t.ownerId === id ? { ...t, ownerId: undefined } : t)),
      runSheet: s.runSheet && {
        ...s.runSheet,
        segments: s.runSheet.segments.map((seg) =>
          seg.ownerId === id ? { ...seg, ownerId: undefined } : seg,
        ),
      },
    })),
});
