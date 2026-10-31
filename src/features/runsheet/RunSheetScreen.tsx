import { useMemo } from 'react';
import { Link } from 'react-router';
import { Page } from '../../components/ui/Page';
import { NeedsFirst } from '../../components/ui/NeedsFirst';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store';
import { selectRunSheetViolations } from '../../store/selectors';
import { sortByOffset } from '../../engine/runSheet';
import { useSegmentEdits } from './useSegmentEdits';
import { ConstraintList } from './components/ConstraintList';
import { useRunSheetDraft } from './useRunSheetDraft';
import { SegmentRow } from './components/SegmentRow';

export default function RunSheetScreen() {
  const event = useStore((s) => s.event);
  const runSheet = useStore((s) => s.runSheet);
  const helpers = useStore((s) => s.helpers);
  const violations = useStore(selectRunSheetViolations);
  const { draft, status, failed } = useRunSheetDraft();
  const ordered = useMemo(() => sortByOffset(runSheet?.segments ?? []), [runSheet]);
  const byId = useMemo(() => new Map(ordered.map((s) => [s.id, s])), [ordered]);

  const edits = useSegmentEdits();

  if (!event)
    return <NeedsFirst title="Run sheet" before="Add your" to="/intake" link="event details" />;
  return (
    <Page
      title="Run sheet"
      intro="The event-day schedule. Guest constraints are checked on every change."
      actions={
        runSheet ? (
          <Link
            to="/live"
            className="inline-flex min-h-[44px] items-center rounded border-2 border-accent bg-accent px-4 text-accent-fg"
          >
            Open Live mode
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={runSheet ? 'secondary' : 'primary'}
          busy={status === 'loading'}
          busyLabel="Drafting…"
          onClick={() => void draft()}
        >
          {runSheet ? 'Redraft run sheet (saved as a version first)' : 'Draft run sheet'}
        </Button>
        {failed ? (
          <p>
            <span aria-hidden="true">ℹ </span>The assistant was unavailable, so a standard run
            sheet was used.
          </p>
        ) : null}
      </div>
      {runSheet ? (
        <>
          <ConstraintList constraints={runSheet.constraints} byId={byId} />
          <ol className="space-y-3" aria-label="Segments in time order">
            {ordered.map((s, i) => (
              <SegmentRow
                key={s.id}
                segment={s}
                startsAt={event.startsAt}
                helpers={helpers}
                isFirst={i === 0}
                isLast={i === ordered.length - 1}
                violations={violations.filter((v) => v.segmentId === s.id)}
                {...edits}
              />
            ))}
          </ol>
        </>
      ) : (
        <p className="card">
          No run sheet yet. Draft one to get a timed plan with cues for each helper.
        </p>
      )}
    </Page>
  );
}
