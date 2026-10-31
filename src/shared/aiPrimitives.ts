import { z } from 'zod';

/** Building blocks shared by every AI task contract: capped text, assumptions, need counts, slugs. */
export const text = (max: number) => z.string().max(max);
export const Assumptions = z.array(text(200)).max(10).default([]);
export const NeedSummary = z
  .record(text(40), z.number().int().min(0).max(1000))
  .refine((r) => Object.keys(r).length <= 40);
export const Slug = z.string().regex(/^[a-z0-9_-]{1,40}$/);

export const INTAKE_FIELDS = [
  'occasion',
  'startsAt',
  'endsAt',
  'venueType',
  'region',
  'culturalContext',
  'budget',
  'guestCountRough',
  'mealTypes',
  'kidsAgeRange',
  'weatherBackup',
  'weights',
] as const;
export const IntakeField = z.enum(INTAKE_FIELDS);
export type IntakeField = z.infer<typeof IntakeField>;
export const INPUT_TYPES = [
  'text',
  'number',
  'date',
  'datetime',
  'single_choice',
  'multi_choice',
  'money',
  'weights',
] as const;
export const InputType = z.enum(INPUT_TYPES);
export type InputType = z.infer<typeof InputType>;
