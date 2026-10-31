import { useMemo } from 'react';
import { useStore } from '../../../store';
import { selectSeating } from '../../../store/selectors';
import { totalTables } from '../../../engine/seating';
import { SEATS_PER_TABLE } from '../../../engine/constants';

/** Need-aware seating zones with the reason each zone exists and who sits at each table. */
export function SeatingTab() {
  const zones = useStore(selectSeating);
  const guests = useStore((s) => s.guests);
  const names = useMemo(() => new Map(guests.map((g) => [g.id, g.name])), [guests]);

  return (
    <div className="space-y-4">
      <p className="text-muted">
        {totalTables(zones)} tables of up to {SEATS_PER_TABLE}. Wheelchair and stroller users always
        sit in the step-free zone.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {zones.map((z) => (
          <section key={z.id} aria-labelledby={`zone-${z.id}`} className="card space-y-2">
            <h2 id={`zone-${z.id}`}>
              {z.label} · {z.seats} {z.seats === 1 ? 'guest' : 'guests'}
            </h2>
            <ul className="list-disc pl-6 text-sm text-muted">
              {z.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {z.tables.map((t, i) => (
              <div key={`${z.id}-${i}`}>
                <h3 className="text-base font-medium">
                  Table {i + 1} ({t.length})
                </h3>
                <p className="text-sm">
                  {t.length
                    ? t.map((id) => names.get(id) ?? id).join(', ')
                    : 'Reserved for the honoree'}
                </p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
