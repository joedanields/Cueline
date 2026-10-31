import { useStore } from '../../../store';
import { needLabel } from '../../../engine/needs';
import { CoverageTable } from './CoverageTable';
import { DishForm } from './DishForm';

/** Coverage matrix (every dietary group needs ≥ 2 suitable mains) plus the dish list it reads. */
export function MenuTab() {
  const menu = useStore((s) => s.menu);
  const removeDish = useStore((s) => s.removeDish);
  return (
    <div className="space-y-6">
      <CoverageTable />
      <section aria-labelledby="dishes-heading" className="space-y-3">
        <h2 id="dishes-heading">Dishes ({menu.length})</h2>
        <ul className="space-y-1">
          {menu.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{d.name}</span>
              <span className="text-sm text-muted">
                {d.course} ·{' '}
                {d.suitableFor.map((t) => needLabel(`diet:${t}`)).join(', ') || 'no tags'}
              </span>
              <button
                type="button"
                className="min-h-[44px] text-danger underline"
                onClick={() => removeDish(d.id)}
              >
                Remove<span className="sr-only"> {d.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <DishForm />
      </section>
    </div>
  );
}
