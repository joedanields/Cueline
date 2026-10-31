import { memo } from 'react';
import { addMinutes, format } from 'date-fns';
import type { Helper, Segment } from '../../../shared/schemas';
import type { Violation } from '../../../engine/runSheet';
import { Badge } from '../../../components/ui/Badge';
import { SEGMENT_CONTROL as ctl, SegmentFields } from './SegmentFields';

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

function ViolationList({ violations }: { violations: Violation[] }) {
  if (violations.length === 0) return null;
  return (
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
  );
}

/** One run-sheet segment: editable fields, Move up/down (keyboard alternative to drag), inline violations. */
export const SegmentRow = memo(function SegmentRow({
  segment: s,
  startsAt,
  violations,
  isFirst,
  isLast,
  onMove,
  ...edit
}: Props) {
  const time = format(addMinutes(new Date(startsAt), s.offsetMin), 'HH:mm');
  const fixed = s.locked || s.status !== 'upcoming';
  const hard = violations.some((v) => v.severity === 'hard');
  return (
    <li className={`card space-y-2 ${hard ? 'border-danger' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xl font-bold tabular-nums">{time}</span>
        <h3 className="text-base font-semibold">{s.title}</h3>
        {s.locked ? <Badge icon="🔒">Locked</Badge> : null}
        {s.optional ? <Badge>Optional</Badge> : null}
        {s.status !== 'upcoming' ? <Badge tone="ok">{s.status}</Badge> : null}
      </div>
      <p className="text-sm">{s.cue}</p>
      <div className="flex flex-wrap items-end gap-3">
        <SegmentFields segment={s} {...edit} />
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
      <ViolationList violations={violations} />
    </li>
  );
});
