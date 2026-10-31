import { useState } from 'react';
import { Dietary, type Guest } from '../../../shared/schemas';
import { needLabel } from '../../../engine/needs';
import { CheckThis } from './CheckThis';

type Props = { guest: Guest; flagged: boolean; onChange: (dietary: Dietary[]) => void };

/** Diet summary as a disclosure button; expands to a checkbox per diet. */
export function DietCell({ guest: g, flagged, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const text = g.dietary.length ? g.dietary.map((d) => needLabel(`diet:${d}`)).join(', ') : 'None';
  const toggle = (d: Dietary, on: boolean) =>
    onChange(on ? [...g.dietary, d] : g.dietary.filter((x) => x !== d));
  return (
    <td className="p-2">
      <button
        type="button"
        aria-expanded={open}
        className="min-h-[44px] text-left underline"
        onClick={() => setOpen((x) => !x)}
      >
        {text}
        <span className="sr-only">: edit diet for {g.name}</span>
      </button>
      {flagged ? <CheckThis className="block" /> : null}
      {open ? (
        <fieldset className="mt-2 grid gap-1">
          <legend className="sr-only">Diet for {g.name}</legend>
          {Dietary.options.map((d) => (
            <label key={d} className="flex min-h-[24px] items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={g.dietary.includes(d)}
                onChange={(e) => toggle(d, e.target.checked)}
              />
              {needLabel(`diet:${d}`)}
            </label>
          ))}
        </fieldset>
      ) : null}
    </td>
  );
}
