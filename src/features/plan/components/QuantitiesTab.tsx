import { useStore } from '../../../store';
import { selectHeadcount, selectQuantities } from '../../../store/selectors';
import { Badge } from '../../../components/ui/Badge';
import { TableHead } from '../../../components/ui/TableHead';
import type { QuantityLine } from '../../../engine/quantities';

const COLUMNS = [
  'Item',
  { label: 'Amount', numeric: true } as const,
  'How it’s calculated',
  'Your amount',
];

type RowProps = { line: QuantityLine; onOverride: (item: string, amount?: number) => void };

function QuantityRow({ line: q, onOverride }: RowProps) {
  return (
    <tr className="border-t border-line/40 align-top">
      <th scope="row" className="p-2">
        {q.item}
      </th>
      <td className="p-2 text-right tabular-nums">
        {q.amount} {q.unit}{' '}
        {q.manual ? (
          <Badge tone="accent" icon="✎">
            Manual
          </Badge>
        ) : null}
      </td>
      <td className="p-2 text-sm text-muted">{q.basis}</td>
      <td className="p-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            step="0.1"
            aria-label={`Your amount for ${q.item} in ${q.unit}`}
            className="min-h-[44px] w-28 rounded border-2 border-line bg-bg px-2"
            value={q.manual ? q.amount : ''}
            placeholder={String(q.amount)}
            onChange={(e) =>
              onOverride(
                q.item,
                e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
              )
            }
          />
          {q.manual ? (
            <button
              type="button"
              className="min-h-[44px] underline"
              onClick={() => onOverride(q.item, undefined)}
            >
              Use calculated<span className="sr-only"> amount for {q.item}</span>
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

/** Food & drink quantities with their basis; any line can be overridden by hand. */
export function QuantitiesTab() {
  const lines = useStore(selectQuantities);
  const head = useStore(selectHeadcount);
  const setOverride = useStore((s) => s.setQuantityOverride);

  if (lines.length === 0)
    return <p>Add event details (what you’ll serve and when) to see quantities.</p>;
  return (
    <div className="space-y-3">
      <p className="text-muted">
        Planned for {head.expected.toFixed(1).replace(/\.0$/, '')} expected guests. These are
        planning heuristics — adjust any amount to what your caterer recommends.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left">
          <caption className="sr-only">Food and drink quantities</caption>
          <TableHead columns={COLUMNS} />
          <tbody>
            {lines.map((q) => (
              <QuantityRow key={q.item} line={q} onOverride={setOverride} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
