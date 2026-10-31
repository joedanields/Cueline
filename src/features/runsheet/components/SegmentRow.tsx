import { memo } from 'react';
import { addMinutes, format } from 'date-fns';
import type { Helper, Segment } from '../../../shared/schemas';
import type { Violation } from '../../../engine/runSheet';
import { Badge } from '../../../components/ui/Badge';

const ctl = 'min-h-[44px] rounded border-2 border-line bg-bg px-2';

type Props = {
  segment: Segment;
  startsAt: string;
  helpers: Helper[];
  violations: Violation[];
  isFirst: boolean;
  isLast: boolean;
  onChange: (id: string, patch: Partial<Segment>) => void;
  onDuration: (id: string, minutes: number) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
};

/** One run-sheet segment: editable fields, Move up/down (keyboard alternative to drag), inline violations. */
export const SegmentRow = memo(function SegmentRow({
  segment: s,
  startsAt,
  helpers,
  violations,
  isFirst,
  isLast,
  onChange,
  onDuration,
  onMove,
}: Props) {
  const time = format(addMinutes(new Date(startsAt), s.offsetMin), 'HH:mm');
  const fixed = s.locked || s.status !== 'upcoming';
  return (
    <li
      className={`card space-y-2 ${violations.some((v) => v.severity === 'hard') ? 'border-danger' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xl font-bold tabular-nums">{time}</span>
        <h3 className="text-base font-semibold">{s.title}</h3>
        {s.locked ? <Badge icon="🔒">Locked</Badge> : null}
        {s.optional ? <Badge>Optional</Badge> : null}
        {s.status !== 'upcoming' ? <Badge tone="ok">{s.status}</Badge> : null}
      </div>
      <p className="text-sm">{s.cue}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Title
          <input
            className={`${ctl} block w-56`}
            value={s.title}
            maxLength={80}
            onChange={(e) => onChange(s.id, { title: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Minutes (min {s.minDurationMin})
          <input
            type="number"
            className={`${ctl} block w-24`}
            min={1}
            max={600}
            value={s.durationMin}
            onChange={(e) => onDuration(s.id, Number(e.target.value) || 1)}
          />
        </label>
        <label className="text-sm">
          Owner
          <select
            className={`${ctl} block`}
            value={s.ownerId ?? ''}
            onChange={(e) => onChange(s.id, { ownerId: e.target.value || undefined })}
          >
            <option value="">Unassigned</option>
            <option value="organizer">Me (organizer)</option>
            {helpers.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.locked}
            onChange={(e) => onChange(s.id, { locked: e.target.checked })}
          />
          Lock time
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.optional}
            onChange={(e) => onChange(s.id, { optional: e.target.checked })}
          />
          Can be dropped
        </label>
        <button
          type="button"
          className={ctl}
          disabled={isFirst || fixed}
          onClick={() => onMove(s.id, 'up')}
        >
          Move up<span className="sr-only">: {s.title}</span>
        </button>
        <button
          type="button"
          className={ctl}
          disabled={isLast || fixed}
          onClick={() => onMove(s.id, 'down')}
        >
          Move down<span className="sr-only">: {s.title}</span>
        </button>
      </div>
      {violations.length ? (
        <ul className="space-y-1">
          {violations.map((v) => (
            <li
              key={`${v.kind}-${v.constraintId ?? v.message}`}
              className={v.severity === 'hard' ? 'text-danger' : 'text-warn'}
            >
              <span aria-hidden="true">⚠ </span>
              {v.severity === 'hard' ? 'Problem: ' : 'Heads-up: '}
              {v.message}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
});
