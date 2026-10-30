import type { BudgetCategory, BudgetLine, MoneySource, Quote, Vendor, VendorType } from '../../shared/schemas';

export const VENDOR_CATEGORY: Record<VendorType, BudgetCategory> = {
  caterer: 'food',
  venue: 'venue',
  decorator: 'decor',
  photographer: 'photos',
  entertainer: 'entertainment',
  rentals: 'rentals',
  baker: 'food',
  transport: 'misc',
  other: 'misc',
};

/**
 * Money source implied by a quote's status: accepted ⇒ confirmed; received/negotiating ⇒ quote.
 * @example sourceForQuote({ status: 'accepted' }) // 'confirmed'
 */
export function sourceForQuote(q: Pick<Quote, 'status'>): MoneySource | undefined {
  if (q.status === 'accepted') return 'confirmed';
  if (q.status === 'rejected') return undefined;
  return 'quote';
}

/**
 * The quote that should drive the budget: an accepted one wins, otherwise the latest live quote.
 * @example activeQuote(vendor)?.status
 */
export function activeQuote(v: Vendor): Quote | undefined {
  return v.quotes.find((q) => q.status === 'accepted') ?? [...v.quotes].reverse().find((q) => q.status !== 'rejected');
}

/**
 * Budget line for a vendor after its quotes change. Only user-entered amounts are used — the app
 * never invents a price. Returns undefined when no live quote remains (line is then left as is).
 * @example lineForVendor(vendor, lines)?.source // 'quote'
 */
export function lineForVendor(v: Vendor, lines: BudgetLine[]): BudgetLine | undefined {
  const q = activeQuote(v);
  const source = q && sourceForQuote(q);
  if (!q || !source) return undefined;
  const existing = lines.find((l) => l.vendorId === v.id);
  return {
    id: existing?.id ?? `b_v_${v.id}`.slice(0, 40),
    category: existing?.category ?? VENDOR_CATEGORY[v.type],
    label: (v.name || v.type).slice(0, 80),
    amount: q.amount,
    source,
    perGuest: false,
    vendorId: v.id,
  };
}

/**
 * Add AI question suggestions without duplicates (case-insensitive), keeping existing answers.
 * @example mergeQuestions([{ text: 'A?' }], ['a?', 'B?']).length // 2
 */
export function mergeQuestions(existing: Vendor['questions'], suggestions: string[]): Vendor['questions'] {
  const seen = new Set(existing.map((q) => q.text.trim().toLowerCase()));
  const added = suggestions.filter((t) => !seen.has(t.trim().toLowerCase()) && seen.add(t.trim().toLowerCase())).map((text) => ({ text: text.slice(0, 300) }));
  return [...existing, ...added].slice(0, 30);
}
