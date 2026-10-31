import { useStore } from '../../../store';
import { selectBudgetSummary, selectHeadcount } from '../../../store/selectors';
import { BUDGET_CATEGORIES } from '../../../engine/budget';
import { formatMoney } from '../../../lib/money';
import { newId } from '../../../lib/id';
import { Button } from '../../../components/ui/Button';
import { SourceBadge } from '../../../components/ui/Badge';
import { useAnnounce } from '../../../components/ui/LiveRegion';
import { BudgetLineRow } from './BudgetLineRow';

/** Budget: totals, per-guest cost, category breakdown and every line with its source badge. */
export function BudgetTab() {
  const summary = useStore(selectBudgetSummary);
  const expected = useStore(selectHeadcount).expected;
  const lines = useStore((s) => s.budget);
  const upsert = useStore((s) => s.upsertBudgetLine);
  const remove = useStore((s) => s.removeBudgetLine);
  const reallocate = useStore((s) => s.reallocateBudget);
  const announce = useAnnounce();
  if (!summary) return <p>Add event details with a budget to see the breakdown.</p>;
  const fmt = (amount: number) => formatMoney({ amount, currency: summary.total.currency });
  const over = summary.remaining.amount < 0;

  return (
    <div className="space-y-6">
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
      <p className="text-sm text-muted">
        AI never sets prices. Estimates are planning assumptions until you log a vendor quote or
        confirm a cost.
      </p>
      <table className="w-full text-left">
        <caption className="text-left font-semibold">By category</caption>
        <thead>
          <tr>
            <th scope="col" className="p-2">
              Category
            </th>
            <th scope="col" className="p-2 text-right">
              Amount
            </th>
            <th scope="col" className="p-2">
              Sources
            </th>
          </tr>
        </thead>
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
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            upsert({
              id: newId('b'),
              category: 'misc',
              label: 'New line',
              amount: { amount: 0, currency: summary.total.currency },
              source: 'estimate',
              perGuest: false,
            })
          }
        >
          Add a line
        </Button>
        <Button
          onClick={() => {
            reallocate();
            announce(
              'Estimates re-split by your priorities. Quotes and confirmed costs were kept.',
            );
          }}
        >
          Re-split estimates by priorities
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left">
          <caption className="text-left font-semibold">Budget lines</caption>
          <thead>
            <tr>
              {['Label', 'Category', 'Amount', 'Line total', 'Source', 'Actions'].map((h) => (
                <th key={h} scope="col" className="p-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <BudgetLineRow
                key={l.id}
                line={l}
                expected={expected}
                onChange={upsert}
                onRemove={remove}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
