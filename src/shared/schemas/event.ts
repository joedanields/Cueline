import { z } from 'zod';
import { IsoDateTime, MoneySchema } from './common';

export const PriorityWeightsSchema = z.object({
  food: z.number().int().min(0).max(5),
  comfort: z.number().int().min(0).max(5), // guest comfort & accessibility
  decor: z.number().int().min(0).max(5),
  entertainment: z.number().int().min(0).max(5),
  photos: z.number().int().min(0).max(5),
});
export type PriorityWeights = z.infer<typeof PriorityWeightsSchema>;
export const PriorityKey = PriorityWeightsSchema.keyof();
export type PriorityKey = z.infer<typeof PriorityKey>;

export const VenueType = z.enum(['home', 'hall', 'outdoor', 'restaurant', 'other']);
export type VenueType = z.infer<typeof VenueType>;
export const MealType = z.enum(['snacks', 'lunch', 'dinner', 'dessert', 'drinks']);
export type MealType = z.infer<typeof MealType>;

export const EventSchema = z.object({
  occasion: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  venueType: VenueType,
  region: z.string().max(80).optional(), // context only
  culturalContext: z.string().max(200).optional(),
  budget: MoneySchema,
  weights: PriorityWeightsSchema,
  mealTypes: z.array(MealType).min(1).max(5),
  notes: z.string().max(500).optional(),
});
export type CelebrationEvent = z.infer<typeof EventSchema>;
