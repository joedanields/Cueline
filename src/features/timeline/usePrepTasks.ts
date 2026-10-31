import { differenceInCalendarDays } from 'date-fns';
import { useAi } from '../../ai/useAi';
import { fallbackPrepTasks } from '../../ai/fallbacks';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { needSummary } from '../../engine/needs';
import { useStore } from '../../store';
import { selectNeedGroups } from '../../store/selectors';
import { draftsToTasks } from './taskDrafts';

/** Draft prep tasks with the AI (anonymous need counts only); generic + need-triggered fallback. */
export function usePrepTasks() {
  const event = useStore((s) => s.event);
  const groups = useStore(selectNeedGroups);
  const helpersCount = useStore((s) => s.helpers.length);
  const vendors = useStore((s) => s.vendors);
  const announce = useAnnounce();
  const ai = useAi('prepTasks', { loading: 'Drafting prep tasks…', success: () => null });

  const draft = async () => {
    if (!event) return;
    const days = Math.max(
      0,
      Math.min(365, differenceInCalendarDays(new Date(event.startsAt), new Date())),
    );
    const summary = needSummary(groups);
    const out =
      (await ai.run({
        occasion: event.occasion,
        venueType: event.venueType,
        daysUntilEvent: days,
        needSummary: summary,
        mealTypes: event.mealTypes,
        helpersCount,
        hasVendors: [...new Set(vendors.map((v) => v.type))],
      })) ?? fallbackPrepTasks(Object.keys(summary), days);
    const state = useStore.getState();
    state.snapshot('Before drafting prep tasks');
    state.setTasks(draftsToTasks(out.tasks));
    announce(`${out.tasks.length} prep tasks drafted. Check the Do next card.`);
  };

  return { draft, status: ai.status, failed: ai.status === 'error' };
}
