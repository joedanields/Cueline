import { useAi } from '../../ai/useAi';
import { fallbackChecklist } from '../../ai/fallbacks';
import { useAnnounce } from '../../components/ui/LiveRegion';
import type { AiOutput } from '../../shared/aiTasks';
import type { ChecklistItem } from '../../shared/schemas';
import { newId } from '../../lib/id';
import { useStore } from '../../store';
import { selectChecklistTriggers } from '../../store/selectors';

/**
 * Keep only items for triggers the engine decided apply, and keep "done" ticks for unchanged text.
 * @example mergeChecklist(out, ['venue:outdoor'], existing)
 */
export function mergeChecklist(
  out: AiOutput<'checklist'>,
  triggers: string[],
  existing: ChecklistItem[],
): ChecklistItem[] {
  const allowed = new Set(triggers);
  const done = new Set(existing.filter((c) => c.done).map((c) => c.text));
  return out.items
    .filter((i) => allowed.has(i.trigger))
    .map((i) => ({ id: newId('c'), text: i.text, trigger: i.trigger, done: done.has(i.text) }));
}

/** Generate checklist wording for the deterministic triggers; static wording if the AI fails. */
export function useChecklist() {
  const triggers = useStore(selectChecklistTriggers);
  const venueType = useStore((s) => s.event?.venueType ?? 'other');
  const setChecklist = useStore((s) => s.setChecklist);
  const announce = useAnnounce();
  const ai = useAi('checklist', {
    loading: 'Writing your accessibility checklist…',
    success: () => null,
  });

  const generate = async () => {
    if (triggers.length === 0) return;
    const out =
      (await ai.run({
        triggers: triggers.slice(0, 20),
        venueType,
        outdoor: venueType === 'outdoor',
      })) ?? fallbackChecklist(triggers);
    const items = mergeChecklist(out, triggers, useStore.getState().checklist);
    setChecklist(items);
    announce(`Checklist ready: ${items.length} items.`);
  };

  return { triggers, generate, status: ai.status, failed: ai.status === 'error' };
}
