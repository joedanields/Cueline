import type { PriorityKey, PriorityWeights } from '../../shared/schemas';

export const WEIGHT_LABELS: Record<PriorityKey, string> = {
  food: 'Food',
  comfort: 'Guest comfort & accessibility',
  decor: 'Decor',
  entertainment: 'Entertainment',
  photos: 'Photos',
};
const LEVEL = ['not a priority', 'very low', 'low', 'medium', 'high', 'top priority'];

/**
 * Five native range inputs (0–5) with visible labels and spoken values ("4 of 5, high").
 */
export function WeightSliders({ idPrefix, value, onChange }: { idPrefix: string; value: PriorityWeights; onChange: (w: PriorityWeights) => void }) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">Priority weights</legend>
      <p className="text-sm text-muted">Used to split the budget and to decide what to protect if the day runs late.</p>
      {(Object.keys(WEIGHT_LABELS) as PriorityKey[]).map((key) => {
        const id = `${idPrefix}-${key}`;
        const level = LEVEL[value[key]] ?? '';
        return (
          <div key={key} className="grid grid-cols-1 items-center gap-1 sm:grid-cols-[14rem_1fr_8rem]">
            <label htmlFor={id}>{WEIGHT_LABELS[key]}</label>
            <input
              id={id}
              type="range"
              min={0}
              max={5}
              step={1}
              value={value[key]}
              aria-valuetext={`${value[key]} of 5, ${level}`}
              onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
              className="min-h-[44px] w-full accent-accent"
            />
            <output htmlFor={id} className="text-sm text-muted">
              {value[key]} / 5 · {level}
            </output>
          </div>
        );
      })}
    </fieldset>
  );
}
