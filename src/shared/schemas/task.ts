import { z } from 'zod';
import { BudgetCategory } from './budget';

export const TaskCategory = BudgetCategory.or(z.enum(['guests', 'logistics', 'accessibility']));
export type TaskCategory = z.infer<typeof TaskCategory>;
export const TaskStatus = z.enum(['todo', 'doing', 'done', 'slipped']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const PrepTaskSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().max(100),
  category: TaskCategory,
  durationDays: z.number().int().min(0).max(60),
  latestStartDaysBefore: z.number().int().min(0).max(365),
  dependsOn: z.array(z.string().max(40)).max(20),
  ownerId: z.string().max(40).optional(), // helper id or 'organizer'
  status: TaskStatus,
  slipDays: z.number().int().min(0).max(365).default(0),
  needTrigger: z.string().max(60).optional(), // e.g. 'mobility:wheelchair' — why this task exists
});
export type PrepTask = z.infer<typeof PrepTaskSchema>;
