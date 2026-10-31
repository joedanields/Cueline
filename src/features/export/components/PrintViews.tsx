import type { CelebrationEvent, Helper, RunSheet, Segment } from '../../../shared/schemas';
import { TableHead } from '../../../components/ui/TableHead';
import { useStore } from '../../../store';
import { selectSchedule } from '../../../store/selectors';
import { clock } from '../../live/liveLogic';
import { assignmentsFor, buildHelperCard } from '../../helpers/helperLogic';
import { HelperCard } from '../../helpers/components/HelperCard';

type Owner = { id: string; name: string };
type SheetProps = { segments: Segment[]; startsAt: string; ownerName: (id?: string) => string };

/** The whole day in one table: time range, segment, owner and cue. */
export function PrintRunSheet({ segments, startsAt, ownerName }: SheetProps) {
  return (
    <table className="w-full text-left">
      <caption className="sr-only">Run sheet</caption>
      <TableHead columns={['Time', 'Segment', 'Who', 'Cue']} />
      <tbody>
        {segments.map((s) => (
          <tr key={s.id} className="border-t border-line/40 align-top">
            <td className="p-2 tabular-nums">
              {clock(startsAt, s.offsetMin)}–{clock(startsAt, s.offsetMin + s.durationMin)}
            </td>
            <th scope="row" className="p-2">
              {s.title}
            </th>
            <td className="p-2">{ownerName(s.ownerId)}</td>
            <td className="p-2">{s.cue}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type CueProps = { owners: Owner[]; segments: Segment[]; startsAt: string };

/** One page per person with only their own cues; people without cues are skipped. */
export function PrintCueSheets({ owners, segments, startsAt }: CueProps) {
  return owners.map((o) => {
    const mine = segments.filter((s) => s.ownerId === o.id);
    if (mine.length === 0) return null;
    return (
      <section key={o.id} aria-labelledby={`cue-${o.id}`} className="print-break space-y-2">
        <h2 id={`cue-${o.id}`}>{o.name}</h2>
        <ol className="space-y-1">
          {mine.map((s) => (
            <li key={s.id}>
              <strong>{clock(startsAt, s.offsetMin)}</strong> {s.title} — {s.cue}
            </li>
          ))}
        </ol>
      </section>
    );
  });
}

type CardProps = { helpers: Helper[]; event: CelebrationEvent; runSheet?: RunSheet };

/** Every helper's cue card, using scheduled task dates when the timeline is valid. */
export function PrintHelperCards({ helpers, event, runSheet }: CardProps) {
  const schedule = useStore(selectSchedule);
  const tasks = schedule?.ok ? schedule.tasks : [];
  return helpers.map((h) => (
    <HelperCard
      key={h.id}
      card={buildHelperCard(h, event, assignmentsFor(h.id, tasks, runSheet, event.startsAt))}
    />
  ));
}
