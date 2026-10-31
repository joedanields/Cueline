import { useAi } from '../../ai/useAi';
import type { CelebrationEvent, Helper } from '../../shared/schemas';
import { useStore } from '../../store';
import { restoreHelperName, type Assignments } from './helperLogic';

const MAX_TASK_TITLES = 30;
const MAX_BRIEF = 600;

/**
 * Write a helper's brief with the AI. The AI only ever sees "Helper A"; the real name is
 * restored here, in the browser.
 */
export function useHelperBrief(h: Helper, label: string, assignments: Assignments) {
  const upsertHelper = useStore((s) => s.upsertHelper);
  const ai = useAi('helperBrief', {
    loading: `Writing ${h.name}’s brief…`,
    success: () => `Brief for ${h.name} is ready to edit.`,
  });
  const write = async (event: CelebrationEvent) => {
    const out = await ai.run({
      helperLabel: label,
      assignments: {
        tasks: assignments.tasks.map((t) => t.title).slice(0, MAX_TASK_TITLES),
        segments: assignments.segments,
      },
      eventFacts: {
        occasion: event.occasion,
        venueType: event.venueType,
        startsAt: event.startsAt,
      },
    });
    if (!out) return;
    const brief = restoreHelperName(out.brief, label, h.name).slice(0, MAX_BRIEF);
    upsertHelper({ ...h, brief });
  };
  return { write, status: ai.status, error: ai.error };
}
