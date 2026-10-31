import { z } from 'zod';
import { MealType, PriorityKey, PriorityWeightsSchema } from './schemas/event';
import { ConstraintKind, RecoveryOptionSchema, SegmentStatus } from './schemas/runsheet';
import { Assumptions, NeedSummary, Slug, text } from './aiPrimitives';

/** Contracts for the event-day tasks: drafting the run sheet and recovering from delays. */
export const EVENT_DAY_SCHEMAS = {
  runSheet: {
    input: z.object({
      occasion: text(80),
      durationMin: z.number().int().min(30).max(1440),
      mealTypes: z.array(MealType).max(5),
      needSummary: NeedSummary,
      helpers: z.array(z.object({ label: text(30) })).max(20),
      culturalContext: text(200).optional(),
      weights: PriorityWeightsSchema,
    }),
    output: z.object({
      segments: z
        .array(
          z.object({
            key: Slug,
            title: text(80),
            offsetMin: z.number().int().min(0).max(1440),
            durationMin: z.number().int().min(1).max(600),
            minDurationMin: z.number().int().min(1).max(600),
            ownerLabel: text(30),
            cue: text(200),
            priority: PriorityKey,
            optional: z.boolean(),
          }),
        )
        .min(1)
        .max(40),
      constraints: z
        .array(
          z.object({
            kind: ConstraintKind,
            segmentKey: Slug,
            minutesFromStart: z.number().int().min(0).max(1440).optional(),
            otherSegmentKey: Slug.optional(),
            reason: text(120),
            needGroup: text(40),
            severity: z.enum(['hard', 'soft']),
          }),
        )
        .max(30),
      assumptions: Assumptions,
    }),
  },
  recovery: {
    input: z.object({
      segments: z
        .array(
          z.object({
            id: text(40),
            title: text(80),
            status: SegmentStatus,
            offsetMin: z.number().int().min(0),
            durationMin: z.number().int().min(1),
            minDurationMin: z.number().int().min(1),
            priority: PriorityKey,
            optional: z.boolean(),
            locked: z.boolean(),
          }),
        )
        .min(1)
        .max(60),
      breaks: z
        .array(
          z.object({ constraintId: text(40), reason: text(120), byMin: z.number().int().min(1) }),
        )
        .min(1)
        .max(30),
      weights: PriorityWeightsSchema,
      nowOffsetMin: z.number().int().min(0).max(1440),
    }),
    output: z.object({ options: z.array(RecoveryOptionSchema).min(1).max(3) }),
  },
};
