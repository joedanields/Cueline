import { z } from 'zod';
import { IsoDateTime, LIMITS } from './common';
import { EventSchema } from './event';
import { GuestSchema } from './guest';
import { BudgetLineSchema } from './budget';
import { VendorSchema } from './vendor';
import { HelperSchema } from './helper';
import { PrepTaskSchema } from './task';
import { RunSheetSchema } from './runsheet';
import { DishSchema } from './menu';

export const SCHEMA_VERSION = 1 as const;

export const ChecklistItemSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().max(200),
  trigger: z.string().max(60),
  done: z.boolean(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const PersistedStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  event: EventSchema.optional(),
  guests: z.array(GuestSchema).max(LIMITS.guests),
  budget: z.array(BudgetLineSchema).max(LIMITS.budgetLines),
  vendors: z.array(VendorSchema).max(LIMITS.vendors),
  helpers: z.array(HelperSchema).max(LIMITS.helpers),
  tasks: z.array(PrepTaskSchema).max(LIMITS.tasks),
  runSheet: RunSheetSchema.optional(),
  checklist: z.array(ChecklistItemSchema).max(LIMITS.checklist),
  maybeProbability: z.number().min(0).max(1).default(0.5),
  quantityOverrides: z.record(z.string().max(60), z.number().min(0).max(1_000_000)).default({}),
  menu: z.array(DishSchema).max(LIMITS.menu).default([]),
});
export type PersistedState = z.infer<typeof PersistedStateSchema>;

export const VersionSchema = z.object({
  id: z.string().min(1).max(40),
  at: IsoDateTime,
  reason: z.string().max(80),
  snapshot: z.unknown(), // PersistedState, validated on restore
});
export type Version = z.infer<typeof VersionSchema>;

export const VersionListSchema = z.array(VersionSchema).max(LIMITS.versions);

/** Empty plan — the state after "Delete all my data" or a corrupt-storage reset. */
export function emptyPersistedState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    guests: [],
    budget: [],
    vendors: [],
    helpers: [],
    tasks: [],
    checklist: [],
    maybeProbability: 0.5,
    quantityOverrides: {},
    menu: [],
  };
}
