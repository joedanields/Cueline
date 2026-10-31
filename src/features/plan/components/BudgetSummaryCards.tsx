import type { BudgetSummary } from '../../../engine/budget';
import { formatMoney } from '../../../lib/money';
import { SourceBadge } from '../../../components/ui/Badge';
import { BUDGET_CATEGORIES } from '../../../engine/budget';
import { TableHead } from '../../../components/ui/TableHead';

type Props = { summary: BudgetSummary };

/** Totals, remaining (or over budget, flagged with icon + text) and cost per expected guest. */
export function BudgetTotals({ summary }: Props) {
  const fmt = (amount: number) => formatMoney({ amount, currency: summary.total.currency });
  const over = summary.remaining.amount < 0;
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        ['Total budget', fmt(summary.total.amount)],
        ['Planned', fmt(summary.allocated.amount)],
        [over ? 'Over budget by' : 'Remaining', fmt(Math.abs(summary.remaining.amount))],
        ['Per expected guest', fmt(summary.perGuest.amount)],
      ].map(([k, v]) => (
        <div key={k} className="card">
          <dt className="text-sm text-muted">{k}</dt>
          <dd
            className={`text-xl font-bold tabular-nums ${k === 'Over budget by' ? 'text-danger' : ''}`}
          >
            {k === 'Over budget by' ? <span aria-hidden="true">⚠ </span> : null}
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Amount per category with the mix of sources (estimate / quote / confirmed) behind it. */
export function CategoryTable({ summary }: Props) {
  const fmt = (amount: number) => formatMoney({ amount, currency: summary.total.currency });
  return (
    <table className="w-full text-left">
      <caption className="text-left font-semibold">By category</caption>
      <TableHead columns={['Category', { label: 'Amount', numeric: true }, 'Sources']} />
      <tbody>
        {BUDGET_CATEGORIES.map((c) => (
          <tr key={c} className="border-t border-line/40">
            <th scope="row" className="p-2 capitalize">
              {c}
            </th>
            <td className="p-2 text-right tabular-nums">
              {fmt(summary.byCategory[c].amount.amount)}
            </td>
            <td className="flex flex-wrap gap-1 p-2">
              {summary.byCategory[c].sources.map((s) => (
                <SourceBadge key={s} source={s} />
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
