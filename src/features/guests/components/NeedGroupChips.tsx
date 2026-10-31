import type { NeedGroup } from '../../../engine/needs';

type Props = {
  groups: NeedGroup[];
  selected?: string;
  onSelect: (key: string | undefined) => void;
};

/** Need-group summary ("Seniors · 11"); each chip filters the guest table. */
export function NeedGroupChips({ groups, selected, onSelect }: Props) {
  if (groups.length === 0) return <p className="text-muted">No special needs recorded yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Need groups">
      {groups.map((g) => {
        const active = g.key === selected;
        return (
          <li key={g.key}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? undefined : g.key)}
              className={`min-h-[44px] rounded-full border-2 px-3 py-1 ${active ? 'border-accent bg-accent text-accent-fg' : 'border-line'}`}
            >
              {g.label} · {g.count}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
