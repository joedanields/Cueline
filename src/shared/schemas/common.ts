import { z } from 'zod';

/** ISO-4217 code, e.g. "INR". */
export const CurrencySchema = z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code');

/** Upper bound for a single money value in minor units (₹1 billion / $1 billion). */
const MAX_MINOR_UNITS = 100_000_000_000;

/** Money as integer minor units (paise/cents) — never floats. */
export const MoneySchema = z.object({
  amount: z.number().int().min(0).max(MAX_MINOR_UNITS),
  currency: CurrencySchema,
});
export type Money = z.infer<typeof MoneySchema>;

/** ISO 8601 datetime; offsets allowed so local times round-trip. */
export const IsoDateTime = z.iso.datetime({ offset: true });

/** Upper bounds on persisted collections — keeps validation cost and memory predictable. */
export const LIMITS = {
  guests: 500,
  budgetLines: 100,
  vendors: 50,
  helpers: 50,
  tasks: 100,
  segments: 60,
  constraints: 60,
  delayLog: 200,
  checklist: 150,
  versions: 20,
} as const;
