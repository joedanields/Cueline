import { z } from 'zod';
import { IsoDateTime } from './common';

export const HelperSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  phone: z.string().max(20).optional(),
  availableFrom: IsoDateTime.optional(),
  availableTo: IsoDateTime.optional(),
  brief: z.string().max(600).optional(),
});
export type Helper = z.infer<typeof HelperSchema>;
