import { useState } from 'react';
import { useStore } from '../../../store';
import { selectCoverage } from '../../../store/selectors';
import { needLabel } from '../../../engine/needs';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { SelectField, TextField } from '../../../components/ui/Field';
import { Dietary, DishSchema, type Dish } from '../../../shared/schemas';
import { newId } from '../../../lib/id';

const COURSES = DishSchema.shape.course.options;

/** Coverage matrix (every dietary group needs ≥ 2 suitable mains) plus the dish list it reads. */
export function MenuTab() {
  const cells = useStore(selectCoverage);
  const menu = useStore((s) => s.menu);
  const upsertDish = useStore((s) => s.upsertDish);
  const removeDish = useStore((s) => s.removeDish);
  const [name, setName] = useState('');
  const [course, setCourse] = useState<Dish['course']>('main');
  const [tags, setTags] = useState<Dietary[]>([]);

  return (
    <div className="space-y-6">
      <section aria-labelledby="coverage-heading" className="space-y-2">
        <h2 id="coverage-heading">Coverage by dietary group</h2>
        {cells.length === 0 ? (
          <p className="text-muted">No dietary needs among your guests yet.</p>
        ) : (
          <table className="w-full text-left">
            <caption className="sr-only">Menu coverage: suitable mains per dietary group</caption>
            <thead>
              <tr>
                <th scope="col" className="p-2">
                  Group
                </th>
                <th scope="col" className="p-2 text-right">
                  Guests
                </th>
                <th scope="col" className="p-2 text-right">
                  Suitable mains
                </th>
                <th scope="col" className="p-2">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {cells.map((c) => (
                <tr key={c.group} className="border-t border-line/40">
                  <th scope="row" className="p-2">
                    {needLabel(`diet:${c.group}`)}
                  </th>
                  <td className="p-2 text-right tabular-nums">{c.members}</td>
                  <td className="p-2 text-right tabular-nums">
                    {c.dishes} of {c.required}
                  </td>
                  <td className="p-2">
                    {c.ok ? (
                      <Badge tone="ok" icon="✓">
                        Covered
                      </Badge>
                    ) : (
                      <Badge tone="danger" icon="⚠">
                        Gap: add {c.required - c.dishes} more
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
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
        <form
          className="card space-y-3"
          aria-label="Add a dish"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            upsertDish({
              id: newId('k'),
              name: name.trim().slice(0, 80),
              course,
              suitableFor: tags,
            });
            setName('');
            setTags([]);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <TextField
              id="dish-name"
              label="Dish name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
            <SelectField
              id="dish-course"
              label="Course"
              value={course}
              onChange={(e) => setCourse(DishSchema.shape.course.parse(e.target.value))}
            >
              {COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
          </div>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="font-medium">Suitable for</legend>
            {Dietary.options
              .filter((d) => d !== 'other')
              .map((d) => (
                <label key={d} className="flex min-h-[24px] items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tags.includes(d)}
                    onChange={(e) =>
                      setTags(e.target.checked ? [...tags, d] : tags.filter((t) => t !== d))
                    }
                  />
                  {needLabel(`diet:${d}`)}
                </label>
              ))}
          </fieldset>
          <Button type="submit">Add dish</Button>
        </form>
      </section>
    </div>
  );
}
