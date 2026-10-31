import { memo } from 'react';
import {
  AgeBand,
  GuestRole,
  Mobility,
  Rsvp,
  Sensory,
  Travel,
  type Guest,
} from '../../../shared/schemas';
import { lowConfidenceFields } from '../guestImport';
import { CheckThis } from './CheckThis';
import { DietCell } from './DietCell';

type Props = {
  guest: Guest;
  onUpdate: (id: string, patch: Partial<Guest>) => void;
  onRsvp: (guest: Guest, rsvp: Guest['rsvp']) => void;
  onRemove: (guest: Guest) => void;
};

const selectClass = 'min-h-[44px] rounded border-2 border-line bg-bg px-2';
const human = (v: string) => v.replace(/_/g, ' ');

type SelectProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  flagged: boolean;
};

function CellSelect({ label, value, options, onChange, flagged }: SelectProps) {
  return (
    <td className="p-2">
      <div className="flex flex-col gap-1">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${selectClass} ${flagged ? 'border-dashed border-warn' : ''}`}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {human(o)}
            </option>
          ))}
        </select>
        {flagged ? <CheckThis /> : null}
      </div>
    </td>
  );
}

type TagKey = 'ageBand' | 'mobility' | 'sensory' | 'travel' | 'role';
type TagColumn = {
  key: TagKey;
  label: string;
  parse: (v: string) => Partial<Guest>;
  options: readonly string[];
};

/** The single-choice need tags, in table column order (diet sits after age band). */
const AGE: TagColumn = {
  key: 'ageBand',
  label: 'Age band',
  options: AgeBand.options,
  parse: (v) => ({ ageBand: AgeBand.parse(v) }),
};
const TAGS: TagColumn[] = [
  {
    key: 'mobility',
    label: 'Mobility',
    options: Mobility.options,
    parse: (v) => ({ mobility: Mobility.parse(v) }),
  },
  {
    key: 'sensory',
    label: 'Sensory needs',
    options: Sensory.options,
    parse: (v) => ({ sensory: Sensory.parse(v) }),
  },
  {
    key: 'travel',
    label: 'Travel',
    options: Travel.options,
    parse: (v) => ({ travel: Travel.parse(v) }),
  },
  {
    key: 'role',
    label: 'Role',
    options: GuestRole.options,
    parse: (v) => ({ role: GuestRole.parse(v) }),
  },
];

function Actions({
  guest: g,
  needsReview,
  onReviewed,
  onRemove,
}: {
  guest: Guest;
  needsReview: boolean;
  onReviewed: () => void;
  onRemove: () => void;
}) {
  return (
    <td className="space-y-1 p-2">
      {needsReview ? (
        <button type="button" className="min-h-[44px] underline" onClick={onReviewed}>
          Looks right<span className="sr-only"> for {g.name}</span>
        </button>
      ) : null}
      <button type="button" className="min-h-[44px] text-danger underline" onClick={onRemove}>
        Remove<span className="sr-only"> {g.name}</span>
      </button>
    </td>
  );
}

/** One editable guest. Low-confidence tags show "Check this" in text, not just a dashed border. */
export const GuestRow = memo(function GuestRow({ guest: g, onUpdate, onRsvp, onRemove }: Props) {
  const flags = new Set(lowConfidenceFields(g));
  const set = (patch: Partial<Guest>) => onUpdate(g.id, patch);
  const tagCell = (c: TagColumn) => (
    <CellSelect
      key={c.key}
      label={`${c.label} for ${g.name}`}
      value={g[c.key]}
      options={c.options}
      flagged={flags.has(c.key)}
      onChange={(v) => set(c.parse(v))}
    />
  );

  return (
    <tr className="border-t border-line/40 align-top">
      <th scope="row" className="py-2 pr-2 text-left font-medium">
        {g.name}
        {g.role !== 'guest' ? (
          <span className="block text-sm font-normal text-muted">{g.role}</span>
        ) : null}
        {g.note ? <span className="block text-sm font-normal text-muted">{g.note}</span> : null}
      </th>
      {tagCell(AGE)}
      <DietCell guest={g} flagged={flags.has('dietary')} onChange={(dietary) => set({ dietary })} />
      {TAGS.map(tagCell)}
      <CellSelect
        label={`RSVP for ${g.name}`}
        value={g.rsvp}
        options={Rsvp.options}
        flagged={false}
        onChange={(v) => onRsvp(g, Rsvp.parse(v))}
      />
      <Actions
        guest={g}
        needsReview={flags.size > 0}
        onReviewed={() => set({ reviewed: true })}
        onRemove={() => onRemove(g)}
      />
    </tr>
  );
});
