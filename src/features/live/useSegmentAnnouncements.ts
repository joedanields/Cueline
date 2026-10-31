import { useEffect, useRef } from 'react';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { LIVE_ANNOUNCE_THRESHOLD_MIN } from '../../engine/constants';
import type { Segment } from '../../shared/schemas';

type LiveView = { current?: Segment; next?: Segment; minutesLeft: number };

/** Announce segment changes and the ≤ 5-minute mark only — never every tick. */
export function useSegmentAnnouncements({ current, next, minutesLeft }: LiveView) {
  const announce = useAnnounce();
  const announced = useRef({ id: '', soon: false });
  useEffect(() => {
    const id = current?.id ?? '';
    if (id !== announced.current.id) {
      announced.current = { id, soon: false };
      if (current) announce(`Now: ${current.title}.${next ? ` Next: ${next.title}.` : ''}`);
      return;
    }
    if (current && minutesLeft <= LIVE_ANNOUNCE_THRESHOLD_MIN && !announced.current.soon) {
      announced.current.soon = true;
      announce(`${minutesLeft} minutes left in ${current.title}.`);
    }
  }, [announce, current, next, minutesLeft]);
}
