import { useStore } from '../../../store';
import { needLabel } from '../../../engine/needs';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useChecklist } from '../useChecklist';

const triggerLabel = (t: string) => (t === 'venue:outdoor' ? 'Outdoor venue' : needLabel(t));

/** Accessibility & comfort checklist. Which items apply is decided by guest tags; AI writes the words. */
export function ChecklistTab() {
  const { triggers, generate, status, failed } = useChecklist();
  const checklist = useStore((s) => s.checklist);
  const toggle = useStore((s) => s.toggleChecklistItem);
  const setChecklist = useStore((s) => s.setChecklist);
  const active = new Set(triggers);
  const groups = [...new Set(checklist.map((c) => c.trigger))];

  if (triggers.length === 0 && checklist.length === 0) {
    return <p>No accessibility needs detected yet. Add guests (or mark an outdoor venue) and items will appear here.</p>;
  }
  return (
    <div className="space-y-4">
      <p>
        Needs found: {triggers.map(triggerLabel).join(', ') || 'none'}.{' '}
        <Badge tone="accent" icon="✎">Draft — edit freely</Badge>
      </p>
      <Button variant="primary" busy={status === 'loading'} busyLabel="Writing checklist…" onClick={() => void generate()} disabled={triggers.length === 0}>
        {checklist.length ? 'Rewrite checklist' : 'Write checklist'}
      </Button>
      {failed ? <p><span aria-hidden="true">ℹ </span>The assistant was unavailable, so standard wording was used.</p> : null}
      <div className="min-h-[4rem] space-y-4">
        {groups.map((trigger) => (
          <fieldset key={trigger} className="card space-y-2">
            <legend className="px-1 font-semibold">
              {triggerLabel(trigger)} {active.has(trigger) ? null : <Badge tone="neutral">No longer needed</Badge>}
            </legend>
            {checklist.filter((c) => c.trigger === trigger).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <label className="flex min-h-[44px] flex-1 items-center gap-2">
                  <input type="checkbox" checked={c.done} onChange={() => toggle(c.id)} />
                  <span className={c.done ? 'line-through' : ''}>{c.text}</span>
                </label>
                <button type="button" className="min-h-[44px] underline" onClick={() => setChecklist(checklist.filter((x) => x.id !== c.id))}>
                  Remove<span className="sr-only"> “{c.text}”</span>
                </button>
              </div>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
