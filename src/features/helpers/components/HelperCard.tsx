import { format } from 'date-fns';
import type { HelperCardData } from '../../../lib/urlState';

/** The cue card a helper sees: printable (black on white) and shown on the read-only share link. */
export function HelperCard({ card, headingLevel = 2 }: { card: HelperCardData; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const Sub = headingLevel === 1 ? 'h2' : 'h3';
  const when = Number.isNaN(Date.parse(card.event.startsAt)) ? card.event.startsAt : format(new Date(card.event.startsAt), 'EEEE d MMMM, HH:mm');
  return (
    <article className="card space-y-3 print-break" aria-label={`Cue card for ${card.name}`}>
      <Heading className="text-2xl font-bold">{card.name}’s cue card</Heading>
      <p>{card.event.title} · {when} · {card.event.venueType}</p>
      {card.brief ? <p className="whitespace-pre-line border-l-4 border-accent pl-3">{card.brief}</p> : null}
      <section aria-label="Your cues on the day">
        <Sub className="text-lg font-semibold">On the day</Sub>
        {card.segments.length ? (
          <ol className="space-y-1">
            {card.segments.map((s) => (
              <li key={`${s.time}-${s.title}`}><strong className="tabular-nums">{s.time}</strong> — {s.title}: {s.cue}</li>
            ))}
          </ol>
        ) : <p>No cues assigned.</p>}
      </section>
      <section aria-label="Your prep tasks">
        <Sub className="text-lg font-semibold">Before the day</Sub>
        {card.tasks.length ? (
          <ul className="list-disc pl-6">
            {card.tasks.map((t) => <li key={t.title}>{t.title}{t.due ? ` — by ${t.due}` : ''}</li>)}
          </ul>
        ) : <p>No prep tasks assigned.</p>}
      </section>
    </article>
  );
}
