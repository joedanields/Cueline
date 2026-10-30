import { z } from 'zod';

export const AgeBand = z.enum(['infant', 'child', 'teen', 'adult', 'senior']);
export type AgeBand = z.infer<typeof AgeBand>;
export const Dietary = z.enum([
  'vegetarian',
  'vegan',
  'jain',
  'halal',
  'kosher',
  'gluten_free',
  'nut_allergy',
  'dairy_free',
  'diabetic_friendly',
  'soft_food',
  'other',
]);
export type Dietary = z.infer<typeof Dietary>;
export const Mobility = z.enum(['none', 'limited_walking', 'wheelchair', 'stroller']);
export type Mobility = z.infer<typeof Mobility>;
export const Sensory = z.enum(['none', 'low_vision', 'hard_of_hearing', 'noise_sensitive']);
export type Sensory = z.infer<typeof Sensory>;
export const Travel = z.enum(['local', 'out_of_town']);
export type Travel = z.infer<typeof Travel>;
export const GuestRole = z.enum(['honoree', 'vip', 'helper', 'guest']);
export type GuestRole = z.infer<typeof GuestRole>;
export const Rsvp = z.enum(['invited', 'yes', 'no', 'maybe']);
export type Rsvp = z.infer<typeof Rsvp>;

export const TagConfidence = z.enum(['high', 'medium', 'low']);
export type TagConfidence = z.infer<typeof TagConfidence>;

export const GuestSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80), // NEVER sent to AI
  householdId: z.string().max(40).optional(),
  ageBand: AgeBand,
  dietary: z.array(Dietary).max(11),
  mobility: Mobility,
  sensory: Sensory,
  travel: Travel,
  role: GuestRole,
  note: z.string().max(200).optional(), // AI summary of free text, editable
  rsvp: Rsvp,
  confidence: z.record(z.string().max(20), TagConfidence).default({}), // per-field
  reviewed: z.boolean().default(false),
});
export type Guest = z.infer<typeof GuestSchema>;
