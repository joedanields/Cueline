import { z } from 'zod';
import { Dietary } from './guest';

/**
 * A planned dish and the dietary groups it is suitable for. Needed by the menu-coverage matrix
 * (PRD F3); added to the persisted state with a `[]` default so older plans still validate.
 */
export const DishSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  course: z.enum(['main', 'side', 'dessert', 'snack']),
  suitableFor: z.array(Dietary).max(11),
});
export type Dish = z.infer<typeof DishSchema>;
