import { useCallback } from 'react';
import { useAnnounce } from '../../components/ui/LiveRegion';
import type { Rsvp } from '../../shared/schemas';
import { useStore } from '../../store';
import { describeDelta, planFigures } from './rsvpDelta';

/**
 * Change RSVPs and record what it did to the plan ("+1 expected → +0.4 kg mains").
 * Everything recomputes from the engine — no AI call.
 */
export function useRsvpChange() {
  const announce = useAnnounce();
  return useCallback(
    (ids: string[], rsvp: Rsvp, who: string) => {
      const before = planFigures(useStore.getState());
      useStore.getState().setRsvp(ids, rsvp);
      const delta = describeDelta(before, planFigures(useStore.getState()));
      const text = `${who}: ${rsvp}. ${delta}`;
      useStore.getState().logChange(text);
      announce(text);
    },
    [announce],
  );
}
