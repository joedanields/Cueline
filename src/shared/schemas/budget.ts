import { z } from 'zod';
import { MoneySchema } from './common';

export const BudgetCategory = z.enum([
  'venue',
  'food',
  'decor',
  'entertainment',
  'photos',
  'rentals',
  'misc',
]);
export type BudgetCategory = z.infer<typeof BudgetCategory>;
export const MoneySource = z.enum(['estimate', 'quote', 'confirmed']);
export type MoneySource = z.infer<typeof MoneySource>;

export const BudgetLineSchema = z.object({
  id: z.string().min(1).max(40),
  category: BudgetCategory,
  label: z.string().max(80),
  amount: MoneySchema,
  source: MoneySource,
  perGuest: z.boolean(), // scales with expected headcount
  vendorId: z.string().max(40).optional(),
});
export type BudgetLine = z.infer<typeof BudgetLineSchema>;
