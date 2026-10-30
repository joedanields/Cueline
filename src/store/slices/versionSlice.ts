import { LIMITS, PersistedStateSchema } from '../../shared/schemas';
import { newId } from '../../lib/id';
import { pickPersisted } from '../persistence';
import type { SliceCreator, VersionSlice } from '../types';

export const createVersionSlice: SliceCreator<VersionSlice> = (set, get) => ({
  versions: [],
  snapshot: (reason) =>
    set((s) => {
      const version = {
        id: newId('ver'),
        at: new Date().toISOString(),
        reason: reason.slice(0, 80),
        snapshot: structuredClone(pickPersisted(s)),
      };
      // Newest first; the oldest snapshot is evicted beyond the limit.
      return { versions: [version, ...s.versions].slice(0, LIMITS.versions) };
    }),
  restoreVersion: (id) => {
    const version = get().versions.find((v) => v.id === id);
    const parsed = PersistedStateSchema.safeParse(version?.snapshot);
    if (!parsed.success) return false;
    get().replaceState(parsed.data);
    return true;
  },
});
