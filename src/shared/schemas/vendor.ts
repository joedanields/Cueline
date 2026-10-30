import { z } from 'zod';
import { MoneySchema } from './common';

export const VendorType = z.enum([
  'caterer',
  'venue',
  'decorator',
  'photographer',
  'entertainer',
  'rentals',
  'baker',
  'transport',
  'other',
]);
export type VendorType = z.infer<typeof VendorType>;
export const QuoteStatus = z.enum(['received', 'negotiating', 'accepted', 'rejected']);
export type QuoteStatus = z.infer<typeof QuoteStatus>;

export const QuoteSchema = z.object({
  amount: MoneySchema,
  inclusions: z.string().max(500),
  validUntil: z.string().max(40).optional(),
  status: QuoteStatus,
});
export type Quote = z.infer<typeof QuoteSchema>;

export const VendorQuestionSchema = z.object({
  text: z.string().max(300),
  answer: z.string().max(500).optional(),
});
export type VendorQuestion = z.infer<typeof VendorQuestionSchema>;

export const VendorSchema = z.object({
  id: z.string().min(1).max(40),
  type: VendorType,
  name: z.string().max(80),
  contact: z.string().max(120).optional(),
  questions: z.array(VendorQuestionSchema).max(30),
  quotes: z.array(QuoteSchema).max(20),
});
export type Vendor = z.infer<typeof VendorSchema>;
