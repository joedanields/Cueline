import { useCallback, useMemo } from 'react';
import { useAnnounce } from '../../components/ui/LiveRegion';
import type { Segment } from '../../shared/schemas';
import { useStore } from '../../store';
import { moveSegment, setDuration } from './runSheetDraft';

/** Always edit the latest stored segments, so stable callbacks never act on a stale copy. */
const latest = () => useStore.getState().runSheet?.segments ?? [];

/** Stable edit callbacks for segment rows; moves are announced because times shift with them. */
export function useSegmentEdits() {
  const setRunSheet = useStore((s) => s.setRunSheet);
  const announce = useAnnounce();
  const update = useCallback(
    (segments: Segment[]) => {
      const current = useStore.getState().runSheet;
      if (current) setRunSheet({ ...current, segments });
    },
    [setRunSheet],
  );
  return useMemo(
    () => ({
      onChange: (id: string, patch: Partial<Segment>) =>
        update(latest().map((s) => (s.id === id ? { ...s, ...patch } : s))),
      onDuration: (id: string, min: number) => update(setDuration(latest(), id, min)),
      onMove: (id: string, dir: 'up' | 'down') => {
        update(moveSegment(latest(), id, dir));
        announce(`Moved ${dir}. Times updated.`);
      },
    }),
    [announce, update],
  );
}
