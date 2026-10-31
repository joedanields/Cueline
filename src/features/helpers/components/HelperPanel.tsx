import { useMemo, useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { TextAreaField } from '../../../components/ui/Field';
import type { Helper } from '../../../shared/schemas';
import { useStore } from '../../../store';
import { selectSchedule } from '../../../store/selectors';
import { assignmentsFor, buildHelperCard, helperLabel, type Assignments } from '../helperLogic';
import { useHelperBrief } from '../useHelperBrief';
import { ShareCard } from './ShareCard';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function useAssignments(helperId: string): Assignments {
  const event = useStore((s) => s.event);
  const tasks = useStore((s) => s.tasks);
  const schedule = useStore(selectSchedule);
  const runSheet = useStore((s) => s.runSheet);
  return useMemo(
    () =>
      assignmentsFor(helperId, schedule?.ok ? schedule.tasks : tasks, runSheet, event?.startsAt),
    [event?.startsAt, helperId, runSheet, schedule, tasks],
  );
}

const BRIEF_LABEL = (
  <>
    Brief{' '}
    <Badge tone="accent" icon="✎">
      Draft — edit freely
    </Badge>
  </>
);

/** One helper: assignments, AI brief (written for "Helper A", name restored locally), share link. */
export function HelperPanel({ helper: h, index }: { helper: Helper; index: number }) {
  const event = useStore((s) => s.event);
  const upsertHelper = useStore((s) => s.upsertHelper);
  const removeHelper = useStore((s) => s.removeHelper);
  const [showCard, setShowCard] = useState(false);
  const assignments = useAssignments(h.id);
  const brief = useHelperBrief(h, helperLabel(index), assignments);
  const card = event ? buildHelperCard(h, event, assignments) : undefined;

  return (
    <article aria-labelledby={`helper-${h.id}`} className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`helper-${h.id}`}>
          {h.name}
          {h.phone ? <span className="text-base font-normal text-muted"> · {h.phone}</span> : null}
        </h2>
        <button
          type="button"
          className="min-h-[44px] text-danger underline"
          onClick={() => removeHelper(h.id)}
        >
          Remove<span className="sr-only"> {h.name}</span>
        </button>
      </div>
      <p>
        {plural(assignments.tasks.length, 'prep task')} ·{' '}
        {plural(assignments.segments.length, 'cue')} on the day. Assign them on the Timeline and Run
        sheet.
      </p>
      <TextAreaField
        id={`brief-${h.id}`}
        label={BRIEF_LABEL}
        rows={4}
        maxLength={600}
        value={h.brief ?? ''}
        onChange={(e) => upsertHelper({ ...h, brief: e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          busy={brief.status === 'loading'}
          busyLabel="Writing…"
          disabled={!event}
          onClick={() => event && void brief.write(event)}
        >
          {h.brief ? 'Rewrite brief' : 'Write brief'}
        </Button>
        <Button aria-expanded={showCard} onClick={() => setShowCard((x) => !x)}>
          {showCard ? 'Hide cue card' : 'Show cue card'}
        </Button>
      </div>
      {brief.status === 'error' ? (
        <p>
          <span aria-hidden="true">⚠ </span>
          {brief.error?.message} You can write the brief yourself above.
        </p>
      ) : null}
      {showCard && card ? <ShareCard card={card} helperId={h.id} name={h.name} /> : null}
    </article>
  );
}
