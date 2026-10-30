import type { BudgetCategory, BudgetLine, Money, MoneySource, PriorityWeights } from '../shared/schemas';
import { CATEGORY_BASE_SHARE, CATEGORY_WEIGHT, CONTINGENCY_PERCENT } from './constants';

export const BUDGET_CATEGORIES: BudgetCategory[] = ['venue', 'food', 'decor', 'entertainment', 'photos', 'rentals', 'misc'];

/** Signed money for derived values (remaining can go negative when over budget). */
export type SignedMoney = { amount: number; currency: string };

export type BudgetSummary = {
  total: Money;
  allocated: SignedMoney;
  remaining: SignedMoney;
  perGuest: SignedMoney;
  byCategory: Record<BudgetCategory, { amount: SignedMoney; sources: MoneySource[] }>;
};

/**
 * A line's total in minor units. Per-guest lines store a unit price × ceil(expected headcount).
 * @example lineTotal({ amount: { amount: 900, currency: 'INR' }, perGuest: true }, 10.5) // 9900
 */
export function lineTotal(line: Pick<BudgetLine, 'amount' | 'perGuest'>, expectedHeadcount: number): number {
  return line.perGuest ? line.amount.amount * Math.ceil(Math.max(0, expectedHeadcount)) : line.amount.amount;
}

/**
 * Split `total` across integer `scores` so the parts sum EXACTLY to total (largest remainder).
 * @example splitByScores(100, [1, 1, 1]) // [34, 33, 33]
 */
export function splitByScores(total: number, scores: number[]): number[] {
  const sum = scores.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return scores.map(() => 0);
  const raw = scores.map((s) => (total * s) / sum);
  const parts = raw.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    parts[i] = (parts[i] ?? 0) + 1;
    left -= 1;
  }
  return parts;
}

/**
 * Initial/re-run allocation from priority weights. Quote and confirmed lines are kept untouched;
 * existing estimates are replaced. The remaining pool (total − locked) is split: contingency first,
 * then by base share × weight. A weight of 0 gives that category no estimate.
 * @example allocateBudget({ amount: 100000, currency: 'INR' }, weights, [], 50)
 */
export function allocateBudget(total: Money, weights: PriorityWeights, lines: BudgetLine[], expectedHeadcount: number): BudgetLine[] {
  const locked = lines.filter((l) => l.source !== 'estimate');
  const lockedSum = locked.reduce((n, l) => n + lineTotal(l, expectedHeadcount), 0);
  const pool = Math.max(0, total.amount - lockedSum);
  const contingency = Math.floor((pool * CONTINGENCY_PERCENT) / 100);
  const weighted = BUDGET_CATEGORIES.filter((c): c is Exclude<BudgetCategory, 'misc'> => c !== 'misc');
  const scores = weighted.map((c) => CATEGORY_BASE_SHARE[c] * weights[CATEGORY_WEIGHT[c]]);
  const anyScore = scores.some((s) => s > 0);
  const parts = splitByScores(pool - contingency, scores);
  // With every weight at 0 nothing is "wanted": the whole pool stays unallocated in misc.
  const miscAmount = anyScore ? contingency : pool;

  const estimates: BudgetLine[] = weighted.map((category, i) => ({
    id: `b_est_${category}`, category, label: `${capitalize(category)} (estimate)`,
    amount: { amount: parts[i] ?? 0, currency: total.currency }, source: 'estimate' as const, perGuest: false,
  }));
  estimates.push({ id: 'b_est_misc', category: 'misc', label: anyScore ? 'Contingency (estimate)' : 'Unallocated',
    amount: { amount: miscAmount, currency: total.currency }, source: 'estimate', perGuest: false });
  return [...locked, ...estimates.filter((l) => l.amount.amount > 0)];
}

/**
 * Totals, remaining, per-guest cost and per-category breakdown (with which sources contributed).
 * @example summarizeBudget(event.budget, lines, 50).remaining.amount
 */
export function summarizeBudget(total: Money, lines: BudgetLine[], expectedHeadcount: number): BudgetSummary {
  const currency = total.currency;
  const byCategory = Object.fromEntries(
    BUDGET_CATEGORIES.map((c) => [c, { amount: { amount: 0, currency }, sources: [] as MoneySource[] }]),
  ) as BudgetSummary['byCategory'];
  let allocated = 0;
  for (const line of lines) {
    const value = lineTotal(line, expectedHeadcount);
    allocated += value;
    const cat = byCategory[line.category];
    cat.amount.amount += value;
    if (!cat.sources.includes(line.source)) cat.sources.push(line.source);
  }
  const heads = Math.ceil(expectedHeadcount);
  return {
    total,
    allocated: { amount: allocated, currency },
    remaining: { amount: total.amount - allocated, currency },
    perGuest: { amount: heads > 0 ? Math.round(allocated / heads) : 0, currency },
    byCategory,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
