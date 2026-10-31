import { useAi } from '../../ai/useAi';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { computeNeedGroups } from '../../engine/needs';
import { pseudonymize, type GuestLine } from '../../lib/pseudonymize';
import type { Guest } from '../../shared/schemas';
import { useStore } from '../../store';
import { buildGuestsFromLens, guestsWithoutAi, lowConfidenceFields } from './guestImport';

/**
 * Guest Lens import: pseudonymize → `guestLens` → re-attach names locally → add + version snapshot.
 * Without AI the same lines are added with defaults, every tag flagged for review.
 */
export function useGuestImport() {
  const event = useStore((s) => s.event);
  const addGuests = useStore((s) => s.addGuests);
  const snapshot = useStore((s) => s.snapshot);
  const announce = useAnnounce();
  const ai = useAi('guestLens', { loading: 'Analysing guest list…', success: () => null });

  const commit = (guests: Guest[]) => {
    addGuests(guests);
    snapshot(`Imported ${guests.length} guests`);
    const groups = computeNeedGroups(guests).length;
    const review = guests.reduce((n, g) => n + lowConfidenceFields(g).length, 0);
    announce(
      `Added ${guests.length} guests. Found ${groups} need groups, ${review} tags need your review.`,
    );
  };

  const analyse = async (lines: GuestLine[]): Promise<boolean> => {
    const { lines: pseudo, idToName } = pseudonymize(lines);
    const out = await ai.run({
      lines: pseudo,
      occasion: event?.occasion ?? 'Celebration',
      culturalContext: event?.culturalContext,
    });
    if (!out) return false;
    commit(buildGuestsFromLens(out, idToName));
    return true;
  };

  const addWithoutAi = (lines: GuestLine[]) => {
    commit(guestsWithoutAi(lines));
    ai.reset();
  };

  return { analyse, addWithoutAi, status: ai.status, error: ai.error, retry: ai.retry };
}
