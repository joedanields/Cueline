import { Link } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { useStore } from '../../store';
import { selectCoverage } from '../../store/selectors';

type Step = { to: string; label: string; done: boolean; detail: string };

/** Where the organizer is in the flow, with one link per stage. Status is text + icon. */
export function StepsPanel() {
  const event = useStore((s) => s.event);
  const guests = useStore((s) => s.guests.length);
  const tasks = useStore((s) => s.tasks);
  const runSheet = useStore((s) => s.runSheet);
  const helpers = useStore((s) => s.helpers.length);
  const gaps = useStore(selectCoverage).filter((c) => !c.ok).length;

  const steps: Step[] = [
    { to: '/intake', label: 'Event details', done: Boolean(event), detail: event ? event.title : 'Occasion, date, venue, budget, priorities' },
    { to: '/guests', label: 'Guests', done: guests > 0, detail: guests ? `${guests} guests` : 'Paste a list — needs are found for you' },
    { to: '/plan', label: 'Plan', done: Boolean(event) && guests > 0 && gaps === 0, detail: gaps ? `${gaps} menu gap${gaps === 1 ? '' : 's'} to fix` : 'Quantities, seating, checklist, budget' },
    { to: '/timeline', label: 'Prep timeline', done: tasks.length > 0, detail: tasks.length ? `${tasks.filter((t) => t.status === 'done').length} of ${tasks.length} tasks done` : 'Draft tasks with deadlines' },
    { to: '/helpers', label: 'Helpers', done: helpers > 0, detail: helpers ? `${helpers} helpers` : 'Add volunteers and give them cue cards' },
    { to: '/runsheet', label: 'Run sheet', done: Boolean(runSheet), detail: runSheet ? `${runSheet.segments.length} segments` : 'Timed plan for the day' },
  ];

  return (
    <section aria-labelledby="steps-heading" className="card space-y-3">
      <h2 id="steps-heading">Your plan, step by step</h2>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.to} className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{i + 1}.</span>
            <Link to={s.to} className="inline-flex min-h-[44px] items-center font-semibold underline">{s.label}</Link>
            {s.done ? <Badge tone="ok" icon="✓">Done</Badge> : <Badge tone="neutral" icon="○">To do</Badge>}
            <span className="text-sm text-muted">{s.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
