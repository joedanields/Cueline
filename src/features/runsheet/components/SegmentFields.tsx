import type { Helper, Segment } from '../../../shared/schemas';
import { OwnerSelect } from '../../../components/ui/OwnerSelect';

const ctl = 'min-h-[44px] rounded border-2 border-line bg-bg px-2';

type Props = {
  segment: Segment;
  helpers: Helper[];
  onChange: (id: string, patch: Partial<Segment>) => void;
  onDuration: (id: string, minutes: number) => void;
};

type ToggleProps = { label: string; checked: boolean; onChange: (checked: boolean) => void };

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="flex min-h-[44px] items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Editable fields of one segment. Duration changes go through the engine so later times move. */
export function SegmentFields({ segment: s, helpers, onChange, onDuration }: Props) {
  return (
    <>
      <label className="text-sm">
        Title
        <input
          className={`${ctl} block w-56`}
          value={s.title}
          maxLength={80}
          onChange={(e) => onChange(s.id, { title: e.target.value })}
        />
      </label>
      <label className="text-sm">
        Minutes (min {s.minDurationMin})
        <input
          type="number"
          className={`${ctl} block w-24`}
          min={1}
          max={600}
          value={s.durationMin}
          onChange={(e) => onDuration(s.id, Number(e.target.value) || 1)}
        />
      </label>
      <label className="text-sm">
        Owner
        <OwnerSelect
          className="block"
          value={s.ownerId}
          helpers={helpers}
          onChange={(ownerId) => onChange(s.id, { ownerId })}
        />
      </label>
      <Toggle
        label="Lock time"
        checked={s.locked}
        onChange={(locked) => onChange(s.id, { locked })}
      />
      <Toggle
        label="Can be dropped"
        checked={s.optional}
        onChange={(optional) => onChange(s.id, { optional })}
      />
    </>
  );
}

export { ctl as SEGMENT_CONTROL };
