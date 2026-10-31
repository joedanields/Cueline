import { useMemo, useState } from 'react';
import { useAi } from '../../../ai/useAi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { TextAreaField } from '../../../components/ui/Field';
import { encodeHelperCard } from '../../../lib/urlState';
import type { Helper } from '../../../shared/schemas';
import { useStore } from '../../../store';
import { selectSchedule } from '../../../store/selectors';
import { assignmentsFor, buildHelperCard, helperLabel, restoreHelperName } from '../helperLogic';
import { HelperCard } from './HelperCard';

/** One helper: assignments, AI brief (written for "Helper A", name restored locally), share link. */
export function HelperPanel({ helper: h, index }: { helper: Helper; index: number }) {
  const event = useStore((s) => s.event);
  const tasks = useStore((s) => s.tasks);
  const schedule = useStore(selectSchedule);
  const runSheet = useStore((s) => s.runSheet);
  const upsertHelper = useStore((s) => s.upsertHelper);
  const removeHelper = useStore((s) => s.removeHelper);
  const [showCard, setShowCard] = useState(false);
  const label = helperLabel(index);
  const ai = useAi('helperBrief', {
    loading: `Writing ${h.name}’s brief…`,
    success: () => `Brief for ${h.name} is ready to edit.`,
  });
  const assignments = useMemo(
    () => assignmentsFor(h.id, schedule?.ok ? schedule.tasks : tasks, runSheet, event?.startsAt),
    [event?.startsAt, h.id, runSheet, schedule, tasks],
  );
  const card = event ? buildHelperCard(h, event, assignments) : undefined;
  const shareUrl = card ? `${window.location.origin}/card#${encodeHelperCard(card)}` : '';

  const writeBrief = async () => {
    if (!event) return;
    const out = await ai.run({
      helperLabel: label,
      assignments: {
        tasks: assignments.tasks.map((t) => t.title).slice(0, 30),
        segments: assignments.segments,
      },
      eventFacts: {
        occasion: event.occasion,
        venueType: event.venueType,
        startsAt: event.startsAt,
      },
    });
    if (out)
      upsertHelper({ ...h, brief: restoreHelperName(out.brief, label, h.name).slice(0, 600) });
  };

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
        {assignments.tasks.length} prep task{assignments.tasks.length === 1 ? '' : 's'} ·{' '}
        {assignments.segments.length} cue{assignments.segments.length === 1 ? '' : 's'} on the day.
        Assign them on the Timeline and Run sheet.
      </p>
      <TextAreaField
        id={`brief-${h.id}`}
        label={
          <>
            Brief{' '}
            <Badge tone="accent" icon="✎">
              Draft — edit freely
            </Badge>
          </>
        }
        rows={4}
        maxLength={600}
        value={h.brief ?? ''}
        onChange={(e) => upsertHelper({ ...h, brief: e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          busy={ai.status === 'loading'}
          busyLabel="Writing…"
          disabled={!event}
          onClick={() => void writeBrief()}
        >
          {h.brief ? 'Rewrite brief' : 'Write brief'}
        </Button>
        <Button aria-expanded={showCard} onClick={() => setShowCard((x) => !x)}>
          {showCard ? 'Hide cue card' : 'Show cue card'}
        </Button>
      </div>
      {ai.status === 'error' ? (
        <p>
          <span aria-hidden="true">⚠ </span>
          {ai.error?.message} You can write the brief yourself above.
        </p>
      ) : null}
      {showCard && card ? (
        <div className="space-y-2">
          <HelperCard card={card} />
          <label className="block text-sm" htmlFor={`share-${h.id}`}>
            Read-only share link (contains only {h.name}’s card; nothing is stored on a server)
          </label>
          <input
            id={`share-${h.id}`}
            readOnly
            value={shareUrl}
            className="min-h-[44px] w-full rounded border-2 border-line bg-bg px-2 text-sm"
            onFocus={(e) => e.target.select()}
          />
          <a
            href={`/card#${encodeHelperCard(card)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center underline"
          >
            Open printable card<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      ) : null}
    </article>
  );
}
