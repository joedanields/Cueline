import { memo } from 'react';
import { format } from 'date-fns';
import type { ScheduledTask } from '../../../engine/schedule';
import type { Helper, PrepTask } from '../../../shared/schemas';
import { needLabel } from '../../../engine/needs';
import { Badge } from '../../../components/ui/Badge';
import { OwnerSelect } from '../../../components/ui/OwnerSelect';

const day = (iso: string) => format(new Date(`${iso}T00:00:00`), 'EEE d MMM');
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
const SLIP_OPTIONS = [1, 2, 3, 7];

type Props = {
  task: ScheduledTask;
  titles: Map<string, string>;
  helpers: Helper[];
  onUpdate: (id: string, patch: Partial<PrepTask>) => void;
};

/** Statuses as icon + text (never colour alone), in a fixed order. */
function StatusBadges({ task: t }: { task: ScheduledTask }) {
  const done = t.status === 'done';
  return (
    <>
      {done ? (
        <Badge tone="ok" icon="✓">
          Done
        </Badge>
      ) : null}
      {t.isAtRisk ? (
        <Badge tone="danger" icon="⚠">
          At risk
        </Badge>
      ) : null}
      {t.isBlocked && !done ? (
        <Badge tone="warn" icon="⏸">
          Blocked
        </Badge>
      ) : null}
      {t.isCritical ? (
        <Badge tone="accent" icon="★">
          Critical path
        </Badge>
      ) : null}
      {t.status === 'slipped' ? (
        <Badge tone="warn" icon="↷">
          Slipped {t.slipDays} d
        </Badge>
      ) : null}
      {t.needTrigger ? <Badge icon="♿">For: {needLabel(t.needTrigger)}</Badge> : null}
    </>
  );
}

function SlipSelect({ task: t, onUpdate }: Pick<Props, 'task' | 'onUpdate'>) {
  return (
    <label className="flex items-center gap-2 text-sm">
      Slip by
      <select
        className="min-h-[44px] rounded border-2 border-line bg-bg px-2"
        value=""
        onChange={(e) =>
          e.target.value &&
          onUpdate(t.id, { status: 'slipped', slipDays: t.slipDays + Number(e.target.value) })
        }
      >
        <option value="">—</option>
        {SLIP_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {days(n)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** One prep task: deadline, deps, owner, and statuses as icon + text (never colour alone). */
export const TaskItem = memo(function TaskItem({ task: t, titles, helpers, onUpdate }: Props) {
  const done = t.status === 'done';
  return (
    <li className="card space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={`text-base font-semibold ${done ? 'line-through' : ''}`}>{t.title}</h3>
        <StatusBadges task={t} />
      </div>
      <p className="text-sm">
        Start by <strong>{day(t.start)}</strong> · due <strong>{day(t.due)}</strong> ·{' '}
        {days(t.durationDays)} · {t.category}
      </p>
      {t.dependsOn.length ? (
        <p className="text-sm text-muted">
          After: {t.dependsOn.map((d) => titles.get(d) ?? d).join(', ')}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Owner
          <OwnerSelect
            value={t.ownerId}
            helpers={helpers}
            onChange={(ownerId) => onUpdate(t.id, { ownerId })}
          />
        </label>
        <button
          type="button"
          className="min-h-[44px] rounded border-2 border-line px-3"
          onClick={() => onUpdate(t.id, { status: done ? 'todo' : 'done' })}
        >
          {done ? 'Mark not done' : 'Mark done'}
          <span className="sr-only">: {t.title}</span>
        </button>
        {!done ? <SlipSelect task={t} onUpdate={onUpdate} /> : null}
      </div>
    </li>
  );
});
