import { memo, useState } from 'react';
import { AgeBand, Dietary, GuestRole, Mobility, Rsvp, Sensory, Travel, type Guest } from '../../../shared/schemas';
import { needLabel } from '../../../engine/needs';
import { lowConfidenceFields } from '../guestImport';

type Props = {
  guest: Guest;
  onUpdate: (id: string, patch: Partial<Guest>) => void;
  onRsvp: (guest: Guest, rsvp: Guest['rsvp']) => void;
  onRemove: (guest: Guest) => void;
};

const selectClass = 'min-h-[44px] rounded border-2 border-line bg-bg px-2';
const human = (v: string) => v.replace(/_/g, ' ');

type SelectProps = { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; flagged: boolean };

function CellSelect({ label, value, options, onChange, flagged }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${selectClass} ${flagged ? 'border-dashed border-warn' : ''}`}>
        {options.map((o) => <option key={o} value={o}>{human(o)}</option>)}
      </select>
      {flagged ? <span className="text-xs font-semibold text-warn"><span aria-hidden="true">⚠ </span>Check this</span> : null}
    </div>
  );
}

/** One editable guest. Low-confidence tags show "Check this" in text, not just a dashed border. */
export const GuestRow = memo(function GuestRow({ guest: g, onUpdate, onRsvp, onRemove }: Props) {
  const [editDiet, setEditDiet] = useState(false);
  const flags = new Set(lowConfidenceFields(g));
  const set = (patch: Partial<Guest>) => onUpdate(g.id, patch);
  const dietText = g.dietary.length ? g.dietary.map((d) => needLabel(`diet:${d}`)).join(', ') : 'None';

  return (
    <tr className="border-t border-line/40 align-top">
      <th scope="row" className="py-2 pr-2 text-left font-medium">
        {g.name}
        {g.role !== 'guest' ? <span className="block text-sm font-normal text-muted">{g.role}</span> : null}
        {g.note ? <span className="block text-sm font-normal text-muted">{g.note}</span> : null}
      </th>
      <td className="p-2"><CellSelect label={`Age band for ${g.name}`} value={g.ageBand} options={AgeBand.options} flagged={flags.has('ageBand')} onChange={(v) => set({ ageBand: AgeBand.parse(v) })} /></td>
      <td className="p-2">
        <button type="button" aria-expanded={editDiet} className="min-h-[44px] text-left underline" onClick={() => setEditDiet((x) => !x)}>
          {dietText}<span className="sr-only">: edit diet for {g.name}</span>
        </button>
        {flags.has('dietary') ? <span className="block text-xs font-semibold text-warn"><span aria-hidden="true">⚠ </span>Check this</span> : null}
        {editDiet ? (
          <fieldset className="mt-2 grid gap-1">
            <legend className="sr-only">Diet for {g.name}</legend>
            {Dietary.options.map((d) => (
              <label key={d} className="flex min-h-[24px] items-center gap-2 text-sm">
                <input type="checkbox" checked={g.dietary.includes(d)} onChange={(e) => set({ dietary: e.target.checked ? [...g.dietary, d] : g.dietary.filter((x) => x !== d) })} />
                {needLabel(`diet:${d}`)}
              </label>
            ))}
          </fieldset>
        ) : null}
      </td>
      <td className="p-2"><CellSelect label={`Mobility for ${g.name}`} value={g.mobility} options={Mobility.options} flagged={flags.has('mobility')} onChange={(v) => set({ mobility: Mobility.parse(v) })} /></td>
      <td className="p-2"><CellSelect label={`Sensory needs for ${g.name}`} value={g.sensory} options={Sensory.options} flagged={flags.has('sensory')} onChange={(v) => set({ sensory: Sensory.parse(v) })} /></td>
      <td className="p-2"><CellSelect label={`Travel for ${g.name}`} value={g.travel} options={Travel.options} flagged={flags.has('travel')} onChange={(v) => set({ travel: Travel.parse(v) })} /></td>
      <td className="p-2"><CellSelect label={`Role for ${g.name}`} value={g.role} options={GuestRole.options} flagged={flags.has('role')} onChange={(v) => set({ role: GuestRole.parse(v) })} /></td>
      <td className="p-2"><CellSelect label={`RSVP for ${g.name}`} value={g.rsvp} options={Rsvp.options} flagged={false} onChange={(v) => onRsvp(g, Rsvp.parse(v))} /></td>
      <td className="space-y-1 p-2">
        {flags.size > 0 ? (
          <button type="button" className="min-h-[44px] underline" onClick={() => set({ reviewed: true })}>
            Looks right<span className="sr-only"> for {g.name}</span>
          </button>
        ) : null}
        <button type="button" className="min-h-[44px] text-danger underline" onClick={() => onRemove(g)}>
          Remove<span className="sr-only"> {g.name}</span>
        </button>
      </td>
    </tr>
  );
});
