import type { Helper } from '../../shared/schemas';

type Props = {
  value?: string;
  helpers: Helper[];
  onChange: (ownerId: string | undefined) => void;
  className?: string;
};

const BASE = 'min-h-[44px] rounded border-2 border-line bg-bg px-2';

/** Who owns a task or segment: unassigned, the organizer, or a helper. Wrap it in a <label>. */
export function OwnerSelect({ value, helpers, onChange, className = '' }: Props) {
  return (
    <select
      className={`${BASE} ${className}`}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">Unassigned</option>
      <option value="organizer">Me (organizer)</option>
      {helpers.map((h) => (
        <option key={h.id} value={h.id}>
          {h.name}
        </option>
      ))}
    </select>
  );
}
