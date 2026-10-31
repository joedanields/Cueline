import { useStore } from '../../../store';
import { selectBudgetSummary, selectHeadcount } from '../../../store/selectors';
import { newId } from '../../../lib/id';
import { Button } from '../../../components/ui/Button';
import { useAnnounce } from '../../../components/ui/LiveRegion';
import { BudgetLineRow } from './BudgetLineRow';
import { BudgetTotals, CategoryTable } from './BudgetSummaryCards';
import { TableHead } from '../../../components/ui/TableHead';

const COLUMNS = ['Label', 'Category', 'Amount', 'Line total', 'Source', 'Actions'];

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
  const currency = summary.total.currency;
  const addLine = () =>
    upsert({
      id: newId('b'),
      category: 'misc',
      label: 'New line',
      amount: { amount: 0, currency },
      source: 'estimate',
      perGuest: false,
    });
  const resplit = () => {
    reallocate();
    announce('Estimates re-split by your priorities. Quotes and confirmed costs were kept.');
  };

  return (
    <div className="space-y-6">
      <BudgetTotals summary={summary} />
      <p className="text-sm text-muted">
        AI never sets prices. Estimates are planning assumptions until you log a vendor quote or
        confirm a cost.
      </p>
      <CategoryTable summary={summary} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={addLine}>Add a line</Button>
        <Button onClick={resplit}>Re-split estimates by priorities</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left">
          <caption className="text-left font-semibold">Budget lines</caption>
          <TableHead columns={COLUMNS} />
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
