import { memo } from 'react';
import { format } from 'date-fns';
import type { ScheduledTask } from '../../../engine/schedule';
import type { Helper, PrepTask } from '../../../shared/schemas';
import { needLabel } from '../../../engine/needs';
import { Badge } from '../../../components/ui/Badge';

const day = (iso: string) => format(new Date(`${iso}T00:00:00`), 'EEE d MMM');
const SLIP_OPTIONS = [1, 2, 3, 7];

type Props = {
  task: ScheduledTask;
  titles: Map<string, string>;
  helpers: Helper[];
  onUpdate: (id: string, patch: Partial<PrepTask>) => void;
};

/** One prep task: deadline, deps, owner, and statuses as icon + text (never colour alone). */
export const TaskItem = memo(function TaskItem({ task: t, titles, helpers, onUpdate }: Props) {
  const done = t.status === 'done';
  return (
    <li className="card space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={`text-base font-semibold ${done ? 'line-through' : ''}`}>{t.title}</h3>
        {done ? <Badge tone="ok" icon="✓">Done</Badge> : null}
        {t.isAtRisk ? <Badge tone="danger" icon="⚠">At risk</Badge> : null}
        {t.isBlocked && !done ? <Badge tone="warn" icon="⏸">Blocked</Badge> : null}
        {t.isCritical ? <Badge tone="accent" icon="★">Critical path</Badge> : null}
        {t.status === 'slipped' ? <Badge tone="warn" icon="↷">Slipped {t.slipDays} d</Badge> : null}
        {t.needTrigger ? <Badge icon="♿">For: {needLabel(t.needTrigger)}</Badge> : null}
      </div>
      <p className="text-sm">
        Start by <strong>{day(t.start)}</strong> · due <strong>{day(t.due)}</strong> · {t.durationDays} day{t.durationDays === 1 ? '' : 's'} · {t.category}
      </p>
      {t.dependsOn.length ? <p className="text-sm text-muted">After: {t.dependsOn.map((d) => titles.get(d) ?? d).join(', ')}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Owner
          <select className="min-h-[44px] rounded border-2 border-line bg-bg px-2" value={t.ownerId ?? ''} onChange={(e) => onUpdate(t.id, { ownerId: e.target.value || undefined })}>
            <option value="">Unassigned</option>
            <option value="organizer">Me (organizer)</option>
            {helpers.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
        <button type="button" className="min-h-[44px] rounded border-2 border-line px-3" onClick={() => onUpdate(t.id, { status: done ? 'todo' : 'done' })}>
          {done ? 'Mark not done' : 'Mark done'}<span className="sr-only">: {t.title}</span>
        </button>
        {!done ? (
          <label className="flex items-center gap-2 text-sm">
            Slip by
            <select
              className="min-h-[44px] rounded border-2 border-line bg-bg px-2"
              value=""
              onChange={(e) => e.target.value && onUpdate(t.id, { status: 'slipped', slipDays: t.slipDays + Number(e.target.value) })}
            >
              <option value="">—</option>
              {SLIP_OPTIONS.map((n) => <option key={n} value={n}>{n} day{n === 1 ? '' : 's'}</option>)}
            </select>
          </label>
        ) : null}
      </div>
    </li>
  );
});
