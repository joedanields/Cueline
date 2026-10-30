import { z } from 'zod';
import { IsoDateTime, LIMITS } from './common';
import { PriorityKey } from './event';

export const ConstraintKind = z.enum([
  'must_start_before',
  'must_end_before',
  'must_not_overlap',
  'max_wait',
]);
export type ConstraintKind = z.infer<typeof ConstraintKind>;

export const GuestConstraintSchema = z.object({
  id: z.string().min(1).max(40),
  kind: ConstraintKind,
  segmentId: z.string().max(40),
  minutesFromStart: z.number().int().optional(), // for before-constraints
  otherSegmentId: z.string().max(40).optional(),
  reason: z.string().max(120), // "Seniors eat lunch before 13:30"
  needGroup: z.string().max(40), // 'senior', 'child', 'diabetic_friendly'...
  severity: z.enum(['hard', 'soft']),
});
export type GuestConstraint = z.infer<typeof GuestConstraintSchema>;

export const SegmentStatus = z.enum(['upcoming', 'live', 'done', 'skipped']);
export type SegmentStatus = z.infer<typeof SegmentStatus>;

export const SegmentSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().max(80),
  offsetMin: z.number().int().min(0), // minutes from event start
  durationMin: z.number().int().min(1).max(600),
  minDurationMin: z.number().int().min(1), // can shrink to this during recovery
  ownerId: z.string().max(40).optional(),
  cue: z.string().max(200), // what the owner does
  priority: PriorityKey, // which weight this segment serves
  locked: z.boolean().default(false),
  status: SegmentStatus,
  optional: z.boolean(), // can be dropped in recovery
});
export type Segment = z.infer<typeof SegmentSchema>;

export const DelayLogEntrySchema = z.object({
  at: IsoDateTime,
  minutes: z.number().int(),
  note: z.string().max(200),
});
export type DelayLogEntry = z.infer<typeof DelayLogEntrySchema>;

export const RunSheetSchema = z.object({
  segments: z.array(SegmentSchema).max(LIMITS.segments),
  constraints: z.array(GuestConstraintSchema).max(LIMITS.constraints),
  delayLog: z.array(DelayLogEntrySchema).max(LIMITS.delayLog),
});
export type RunSheet = z.infer<typeof RunSheetSchema>;

// ---------- Recovery (AI output, validated) ----------
export const RecoveryOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('shorten'), segmentId: z.string(), byMin: z.number().int().min(1) }),
  z.object({ op: z.literal('drop'), segmentId: z.string() }),
  z.object({ op: z.literal('swap'), a: z.string(), b: z.string() }),
  z.object({ op: z.literal('moveBefore'), segmentId: z.string(), beforeId: z.string() }),
]);
export type RecoveryOp = z.infer<typeof RecoveryOpSchema>;

export const RecoveryOptionSchema = z.object({
  label: z.string().max(60),
  rationale: z.string().max(240),
  ops: z.array(RecoveryOpSchema).min(1).max(6),
});
export type RecoveryOption = z.infer<typeof RecoveryOptionSchema>;
