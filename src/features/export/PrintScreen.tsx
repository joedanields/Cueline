import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store';
import { selectSchedule } from '../../store/selectors';
import { sortByOffset } from '../../engine/runSheet';
import { clock } from '../live/liveLogic';
import { assignmentsFor, buildHelperCard } from '../helpers/helperLogic';
import { HelperCard } from '../helpers/components/HelperCard';

const TITLES: Record<string, string> = { runsheet: 'Run sheet', cues: 'Cue sheets', cards: 'Helper cards' };

/** Print-ready documents: full run sheet, cue sheets grouped by owner, or every helper card. */
export default function PrintScreen() {
  const { kind = 'runsheet' } = useParams();
  const event = useStore((s) => s.event);
  const runSheet = useStore((s) => s.runSheet);
  const helpers = useStore((s) => s.helpers);
  const schedule = useStore(selectSchedule);
  const segments = useMemo(() => sortByOffset((runSheet?.segments ?? []).filter((s) => s.status !== 'skipped')), [runSheet]);
  const owners = useMemo(() => [{ id: 'organizer', name: 'Organizer' }, ...helpers], [helpers]);
  const ownerName = (id?: string) => owners.find((o) => o.id === id)?.name ?? 'Unassigned';
  const title = TITLES[kind] ?? 'Print';

  if (!event || (!runSheet && kind !== 'cards')) {
    return <Page title={title}><p className="card">Nothing to print yet. <Link to="/runsheet" className="underline">Draft a run sheet</Link> first.</p></Page>;
  }
  return (
    <Page title={title} heading={`${title} — ${event.title}`} actions={<Button onClick={() => window.print()}>Print</Button>}>
      {kind === 'runsheet' ? (
        <table className="w-full text-left">
          <caption className="sr-only">Run sheet</caption>
          <thead><tr><th scope="col" className="p-2">Time</th><th scope="col" className="p-2">Segment</th><th scope="col" className="p-2">Who</th><th scope="col" className="p-2">Cue</th></tr></thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.id} className="border-t border-line/40 align-top">
                <td className="p-2 tabular-nums">{clock(event.startsAt, s.offsetMin)}–{clock(event.startsAt, s.offsetMin + s.durationMin)}</td>
                <th scope="row" className="p-2">{s.title}</th>
                <td className="p-2">{ownerName(s.ownerId)}</td>
                <td className="p-2">{s.cue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {kind === 'cues' ? owners.map((o) => {
        const mine = segments.filter((s) => s.ownerId === o.id);
        return mine.length ? (
          <section key={o.id} aria-labelledby={`cue-${o.id}`} className="print-break space-y-2">
            <h2 id={`cue-${o.id}`}>{o.name}</h2>
            <ol className="space-y-1">{mine.map((s) => <li key={s.id}><strong>{clock(event.startsAt, s.offsetMin)}</strong> {s.title} — {s.cue}</li>)}</ol>
          </section>
        ) : null;
      }) : null}
      {kind === 'cards' ? helpers.map((h) => (
        <HelperCard key={h.id} card={buildHelperCard(h, event, assignmentsFor(h.id, schedule?.ok ? schedule.tasks : [], runSheet, event.startsAt))} />
      )) : null}
    </Page>
  );
}
