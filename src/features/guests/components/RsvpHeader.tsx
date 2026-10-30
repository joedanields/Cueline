import { useStore } from '../../../store';
import { selectHeadcount } from '../../../store/selectors';

const PERCENT = 100;

/** Confirmed vs expected headcount, the maybe probability, and what the last change did. */
export function RsvpHeader() {
  const head = useStore(selectHeadcount);
  const maybeProbability = useStore((s) => s.maybeProbability);
  const setMaybeProbability = useStore((s) => s.setMaybeProbability);
  const changeLog = useStore((s) => s.changeLog);
  const stats: [string, string | number][] = [
    ['Confirmed', head.confirmed],
    ['Expected', head.expected.toFixed(1).replace(/\.0$/, '')],
    ['Maybe', head.byStatus.maybe],
    ['No reply yet', head.byStatus.invited],
    ['Declined', head.byStatus.no],
  ];

  return (
    <section aria-labelledby="rsvp-heading" className="card space-y-3">
      <h2 id="rsvp-heading">RSVPs</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-1 sm:grid-cols-[16rem_1fr_4rem] sm:items-center">
        <label htmlFor="maybe-p">Count each “maybe” as</label>
        <input
          id="maybe-p"
          type="range"
          min={0}
          max={PERCENT}
          step={10}
          value={Math.round(maybeProbability * PERCENT)}
          aria-valuetext={`${Math.round(maybeProbability * PERCENT)} percent of a guest`}
          onChange={(e) => setMaybeProbability(Number(e.target.value) / PERCENT)}
          className="min-h-[44px] accent-accent"
        />
        <output htmlFor="maybe-p">{Math.round(maybeProbability * PERCENT)}%</output>
      </div>
      <p className="text-sm text-muted">Guests with no reply yet are planned as attending until they decline.</p>
      {changeLog[0] ? (
        <p>
          <span className="font-semibold">Last change: </span>
          {changeLog[0].text}
        </p>
      ) : null}
      {changeLog.length > 1 ? (
        <details>
          <summary className="cursor-pointer underline">Change log ({changeLog.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {changeLog.map((c) => <li key={c.at + c.text}>{c.text}</li>)}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
