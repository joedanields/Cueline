import { useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';
import { selectRunSheetViolations } from '../../store/selectors';
import { constraintBreak, sortByOffset } from '../../engine/runSheet';
import type { Segment } from '../../shared/schemas';
import { moveSegment, setDuration } from './runSheetDraft';
import { useRunSheetDraft } from './useRunSheetDraft';
import { SegmentRow } from './components/SegmentRow';

export default function RunSheetScreen() {
  const event = useStore((s) => s.event);
  const runSheet = useStore((s) => s.runSheet);
  const helpers = useStore((s) => s.helpers);
  const violations = useStore(selectRunSheetViolations);
  const setRunSheet = useStore((s) => s.setRunSheet);
  const announce = useAnnounce();
  const { draft, status, failed } = useRunSheetDraft();
  const ordered = useMemo(() => sortByOffset(runSheet?.segments ?? []), [runSheet]);
  const byId = useMemo(() => new Map(ordered.map((s) => [s.id, s])), [ordered]);

  const update = useCallback((segments: Segment[]) => {
    const current = useStore.getState().runSheet;
    if (current) setRunSheet({ ...current, segments });
  }, [setRunSheet]);
  const onChange = useCallback((id: string, patch: Partial<Segment>) => update((useStore.getState().runSheet?.segments ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s))), [update]);
  const onDuration = useCallback((id: string, min: number) => update(setDuration(useStore.getState().runSheet?.segments ?? [], id, min)), [update]);
  const onMove = useCallback((id: string, dir: 'up' | 'down') => {
    update(moveSegment(useStore.getState().runSheet?.segments ?? [], id, dir));
    announce(`Moved ${dir}. Times updated.`);
  }, [announce, update]);

  if (!event) return <Page title="Run sheet"><p className="card">Add your <Link to="/intake" className="underline">event details</Link> first.</p></Page>;
  return (
    <Page title="Run sheet" intro="The event-day schedule. Guest constraints are checked on every change." actions={runSheet ? <Link to="/live" className="inline-flex min-h-[44px] items-center rounded border-2 border-accent bg-accent px-4 text-accent-fg">Open Live mode</Link> : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={runSheet ? 'secondary' : 'primary'} busy={status === 'loading'} busyLabel="Drafting…" onClick={() => void draft()}>
          {runSheet ? 'Redraft run sheet (saved as a version first)' : 'Draft run sheet'}
        </Button>
        {failed ? <p><span aria-hidden="true">ℹ </span>The assistant was unavailable, so a standard run sheet was used.</p> : null}
      </div>
      {runSheet ? (
        <>
          <section aria-labelledby="constraints-heading" className="card space-y-2">
            <h2 id="constraints-heading">Guest constraints</h2>
            {runSheet.constraints.length === 0 ? <p className="text-muted">None.</p> : (
              <ul className="space-y-1">
                {runSheet.constraints.map((c) => {
                  const by = constraintBreak(c, byId);
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-2">
                      {by > 0 ? <Badge tone="danger" icon="⚠">Misses by {by} min</Badge> : <Badge tone="ok" icon="✓">Met</Badge>}
                      <span>{c.reason}</span>
                      <span className="text-sm text-muted">({c.severity === 'hard' ? 'must' : 'should'} · {byId.get(c.segmentId)?.title ?? 'removed segment'})</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <ol className="space-y-3" aria-label="Segments in time order">
            {ordered.map((s, i) => (
              <SegmentRow key={s.id} segment={s} startsAt={event.startsAt} helpers={helpers} isFirst={i === 0} isLast={i === ordered.length - 1}
                violations={violations.filter((v) => v.segmentId === s.id)} onChange={onChange} onDuration={onDuration} onMove={onMove} />
            ))}
          </ol>
        </>
      ) : <p className="card">No run sheet yet. Draft one to get a timed plan with cues for each helper.</p>}
    </Page>
  );
}
