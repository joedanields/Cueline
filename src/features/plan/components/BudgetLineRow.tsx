import { memo, useState } from 'react';
import { BudgetCategory, MoneySource, type BudgetLine } from '../../../shared/schemas';
import { formatMoney, minorToMajorInput, parseMajorToMinor } from '../../../lib/money';
import { lineTotal } from '../../../engine/budget';
import { SourceBadge } from '../../../components/ui/Badge';

const cell = 'min-h-[44px] rounded border-2 border-line bg-bg px-2';

type Props = {
  line: BudgetLine;
  expected: number;
  onChange: (l: BudgetLine) => void;
  onRemove: (id: string) => void;
};

type SelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: string) => void;
};

function OptionSelect<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <select
      aria-label={label}
      className={cell}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** Amount edits commit on blur so partial input ("12.") is never lost. */
function AmountCell({ line, onChange }: Pick<Props, 'line' | 'onChange'>) {
  const [amount, setAmount] = useState(minorToMajorInput(line.amount.amount, line.amount.currency));
  const [invalid, setInvalid] = useState(false);
  const commit = () => {
    const minor = parseMajorToMinor(amount, line.amount.currency);
    setInvalid(minor === undefined);
    if (minor !== undefined && minor !== line.amount.amount)
      onChange({ ...line, amount: { ...line.amount, amount: minor } });
  };
  return (
    <td className="p-2">
      <input
        aria-label={`Amount for ${line.label}${line.perGuest ? ' per guest' : ''}`}
        aria-invalid={invalid || undefined}
        inputMode="decimal"
        className={`${cell} w-32 text-right`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={commit}
      />
      {invalid ? <span className="block text-xs text-danger">⚠ Enter a number</span> : null}
      <label className="mt-1 flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={line.perGuest}
          onChange={(e) => onChange({ ...line, perGuest: e.target.checked })}
        />{' '}
        per guest
      </label>
    </td>
  );
}

/** Editable budget line: label, category, amount (per guest or flat), total and source badge. */
export const BudgetLineRow = memo(function BudgetLineRow({
  line,
  expected,
  onChange,
  onRemove,
}: Props) {
  const total = formatMoney({ amount: lineTotal(line, expected), currency: line.amount.currency });
  return (
    <tr className="border-t border-line/40 align-top">
      <td className="p-2">
        <input
          aria-label="Label"
          className={`${cell} w-full`}
          value={line.label}
          maxLength={80}
          onChange={(e) => onChange({ ...line, label: e.target.value })}
        />
      </td>
      <td className="p-2">
        <OptionSelect
          label={`Category for ${line.label}`}
          value={line.category}
          options={BudgetCategory.options}
          onChange={(v) => onChange({ ...line, category: BudgetCategory.parse(v) })}
        />
      </td>
      <AmountCell line={line} onChange={onChange} />
      <td className="p-2 text-right tabular-nums">{total}</td>
      <td className="p-2">
        <div className="flex flex-col gap-1">
          <SourceBadge source={line.source} />
          <OptionSelect
            label={`Source for ${line.label}`}
            value={line.source}
            options={MoneySource.options}
            onChange={(v) => onChange({ ...line, source: MoneySource.parse(v) })}
          />
        </div>
      </td>
      <td className="p-2">
        <button
          type="button"
          className="min-h-[44px] text-danger underline"
          onClick={() => onRemove(line.id)}
        >
          Remove<span className="sr-only"> {line.label}</span>
        </button>
      </td>
    </tr>
  );
});
