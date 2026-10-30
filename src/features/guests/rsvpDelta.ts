import { formatMoney } from '../../lib/money';
import type { StoreState } from '../../store/types';
import { selectBudgetSummary, selectHeadcount, selectQuantities, selectSeating } from '../../store/selectors';
import { totalTables } from '../../engine/seating';

export type PlanFigures = { expected: number; mainsKg: number; tables: number; foodBudget: number; currency: string };

/** The figures an RSVP change can move (all derived, never stored). */
export function planFigures(s: StoreState): PlanFigures {
  const summary = selectBudgetSummary(s);
  return {
    expected: selectHeadcount(s).expected,
    mainsKg: selectQuantities(s).find((q) => q.item === 'Mains')?.amount ?? 0,
    tables: totalTables(selectSeating(s)),
    foodBudget: summary?.byCategory.food.amount.amount ?? 0,
    currency: summary?.total.currency ?? 'USD',
  };
}

const signed = (n: number, digits = 1) => `${n > 0 ? '+' : '−'}${Math.abs(Number(n.toFixed(digits)))}`;

/**
 * "+6 expected → +2.1 kg mains, +1 table, food budget +₹5,400" — or a no-change message.
 * @example describeDelta(before, after) // '+1 expected → +0.4 kg mains'
 */
export function describeDelta(before: PlanFigures, after: PlanFigures): string {
  const d = {
    expected: after.expected - before.expected,
    mains: after.mainsKg - before.mainsKg,
    tables: after.tables - before.tables,
    food: after.foodBudget - before.foodBudget,
  };
  const effects: string[] = [];
  if (Math.abs(d.mains) >= 0.05) effects.push(`${signed(d.mains)} kg mains`);
  if (d.tables !== 0) effects.push(`${signed(d.tables, 0)} table${Math.abs(d.tables) === 1 ? '' : 's'}`);
  if (d.food !== 0) effects.push(`food budget ${d.food > 0 ? '+' : '−'}${formatMoney({ amount: Math.abs(d.food), currency: after.currency })}`);
  if (Math.abs(d.expected) < 0.05 && effects.length === 0) return 'No change to the plan.';
  const head = `${signed(d.expected)} expected`;
  return effects.length ? `${head} → ${effects.join(', ')}` : `${head} (no change to quantities, tables or budget)`;
}
