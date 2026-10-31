import { z } from 'zod';
import {
  AgeBand,
  Dietary,
  GuestRole,
  Mobility,
  Sensory,
  TagConfidence,
  Travel,
} from './schemas/guest';
import { MealType, VenueType } from './schemas/event';
import { TaskCategory } from './schemas/task';
import { VendorType } from './schemas/vendor';
import { Assumptions, IntakeField, NeedSummary, Slug, text, InputType } from './aiPrimitives';

export { INTAKE_FIELDS, INPUT_TYPES, IntakeField, InputType } from './aiPrimitives';
import { EVENT_DAY_SCHEMAS } from './aiEventDaySchemas';

/**
 * Contracts for every AI task (docs/AI_PROMPTS.md). Shared by the proxy (validates input and
 * Gemini output) and the browser (validates the response again before rendering).
 */
export const AI_TASKS = [
  'intakeNext',
  'guestLens',
  'checklist',
  'prepTasks',
  'helperBrief',
  'vendorQuestions',
  'runSheet',
  'recovery',
  'invites',
] as const;
export const AiTaskName = z.enum(AI_TASKS);
export type AiTaskName = z.infer<typeof AiTaskName>;

const AnswerValue = z.union([text(200), z.number(), z.array(text(60)).max(10)]);
const MAX_INTAKE_INPUT_CHARS = 4096;

export const AiSchemas = {
  intakeNext: {
    input: z
      .object({
        answers: z.partialRecord(IntakeField, AnswerValue),
        asked: z.array(IntakeField).max(12),
      })
      .refine((v) => JSON.stringify(v).length <= MAX_INTAKE_INPUT_CHARS, 'Input too large'),
    output: z.object({
      done: z.boolean(),
      field: IntakeField.optional(),
      question: text(200).optional(),
      inputType: InputType.optional(),
      options: z.array(text(60)).max(10).optional(),
      why: text(200).optional(),
    }),
  },
  guestLens: {
    input: z.object({
      lines: z
        .array(z.object({ id: z.string().regex(/^g_\d{3}$/), text: text(200) }))
        .min(1)
        .max(250),
      occasion: text(80),
      culturalContext: text(200).optional(),
    }),
    output: z.object({
      guests: z
        .array(
          z.object({
            id: z.string().regex(/^g_\d{3}[a-z]?$/),
            ageBand: AgeBand,
            dietary: z.array(Dietary).max(11),
            mobility: Mobility,
            sensory: Sensory,
            travel: Travel,
            role: GuestRole,
            note: text(120).optional(),
            confidence: z
              .object({
                ageBand: TagConfidence,
                dietary: TagConfidence,
                mobility: TagConfidence,
                sensory: TagConfidence,
                travel: TagConfidence,
                role: TagConfidence,
              })
              .partial()
              .default({}),
          }),
        )
        .max(1000),
      assumptions: Assumptions,
    }),
  },
  checklist: {
    input: z.object({
      triggers: z.array(text(40)).min(1).max(20),
      venueType: VenueType,
      outdoor: z.boolean(),
    }),
    output: z.object({ items: z.array(z.object({ trigger: text(40), text: text(100) })).max(60) }),
  },
  prepTasks: {
    input: z.object({
      occasion: text(80),
      venueType: VenueType,
      daysUntilEvent: z.number().int().min(0).max(365),
      needSummary: NeedSummary,
      mealTypes: z.array(MealType).max(5),
      helpersCount: z.number().int().min(0).max(50),
      hasVendors: z.array(VendorType).max(9),
    }),
    output: z.object({
      tasks: z
        .array(
          z.object({
            key: Slug,
            title: text(100),
            category: TaskCategory,
            durationDays: z.number().int().min(0).max(60),
            latestStartDaysBefore: z.number().int().min(0).max(365),
            dependsOn: z.array(Slug).max(10),
            ownerRole: z.enum(['organizer', 'helper', 'vendor']),
            needTrigger: text(60).optional(),
          }),
        )
        .min(1)
        .max(30),
      assumptions: Assumptions,
    }),
  },
  helperBrief: {
    input: z.object({
      helperLabel: text(20),
      assignments: z.object({
        tasks: z.array(text(100)).max(30),
        segments: z.array(z.object({ time: text(10), title: text(80), cue: text(200) })).max(30),
      }),
      eventFacts: z.object({ occasion: text(80), venueType: VenueType, startsAt: text(40) }),
    }),
    output: z.object({ brief: text(600) }),
  },
  vendorQuestions: {
    input: z.object({
      vendorType: VendorType,
      needSummary: NeedSummary,
      venueType: VenueType,
      occasion: text(80),
    }),
    output: z.object({
      questions: z
        .array(z.object({ text: text(300), why: text(200) }))
        .min(1)
        .max(12),
    }),
  },
  ...EVENT_DAY_SCHEMAS,
  invites: {
    input: z.object({
      group: text(40),
      eventFacts: z.object({
        occasion: text(80),
        title: text(80),
        date: text(40),
        time: text(20),
        venueType: VenueType,
      }),
      groupSpecifics: z.array(text(120)).max(10),
      tone: z.enum(['warm', 'formal', 'playful']),
    }),
    output: z.object({ text: text(700) }),
  },
} satisfies Record<AiTaskName, { input: z.ZodType; output: z.ZodType }>;

export type AiInput<T extends AiTaskName> = z.input<(typeof AiSchemas)[T]['input']>;
export type AiOutput<T extends AiTaskName> = z.infer<(typeof AiSchemas)[T]['output']>;

/** Request body accepted by POST /api/ai. The input is validated per task afterwards. */
export const AiRequestSchema = z.object({ task: AiTaskName, input: z.unknown() });

export const AI_ERROR_CODES = [
  'bad_request',
  'forbidden',
  'method_not_allowed',
  'unsupported_media_type',
  'payload_too_large',
  'rate_limited',
  'timeout',
  'upstream',
  'invalid_response',
  'misconfigured',
] as const;
export type AiErrorCode = (typeof AI_ERROR_CODES)[number];
