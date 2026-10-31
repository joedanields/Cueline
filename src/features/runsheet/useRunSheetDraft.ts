import { useAi } from '../../ai/useAi';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { needSummary } from '../../engine/needs';
import { useStore } from '../../store';
import { selectEventDurationMin, selectNeedGroups } from '../../store/selectors';
import { helperLabel } from '../helpers/helperLogic';
import { fallbackRunSheet, runSheetFromDraft } from './runSheetDraft';

const MIN_DURATION = 30;

/** Draft the event-day run sheet with the AI (helpers as "Helper A"…); deterministic fallback. */
export function useRunSheetDraft() {
  const event = useStore((s) => s.event);
  const helpers = useStore((s) => s.helpers);
  const groups = useStore(selectNeedGroups);
  const duration = useStore(selectEventDurationMin);
  const announce = useAnnounce();
  const ai = useAi('runSheet', { loading: 'Drafting the run sheet…', success: () => null });

  const draft = async () => {
    if (!event) return;
    const needs = needSummary(groups);
    const out = await ai.run({
      occasion: event.occasion,
      durationMin: Math.max(MIN_DURATION, Math.min(1440, duration)),
      mealTypes: event.mealTypes,
      needSummary: needs,
      helpers: helpers.slice(0, 20).map((_, i) => ({ label: helperLabel(i) })),
      culturalContext: event.culturalContext,
      weights: event.weights,
    });
    const sheet = out
      ? runSheetFromDraft(out, helpers)
      : fallbackRunSheet(duration, event.mealTypes, needs);
    const state = useStore.getState();
    state.snapshot('Before drafting the run sheet');
    state.setRunSheet(sheet);
    announce(
      `Run sheet drafted: ${sheet.segments.length} segments, ${sheet.constraints.length} guest constraints.`,
    );
  };

  return { draft, status: ai.status, failed: ai.status === 'error' };
}
