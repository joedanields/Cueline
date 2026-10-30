# Data model — Cueline

All shapes are defined as **zod schemas in `src/shared/schemas/`**; TypeScript types are inferred.
This document is the spec — implement exactly, then keep both in sync.

## Conventions
- IDs: `string`, prefixed (`g_`, `h_`, `t_`, `s_`, `v_`) + nanoid(8). Pseudonymous guest IDs sent to
  AI are separate (`g_001`…) and mapped back.
- Money: `{ amount: int (minor units), currency: ISO-4217 string }`.
- Time: ISO 8601 strings. Durations: integer minutes. Day offsets: integer days before event.
- All arrays default to `[]`; optional fields are `.optional()`, never `null`.

## Core schemas

```ts
// ---------- Event / intake ----------
export const PriorityWeightsSchema = z.object({
  food: z.number().int().min(0).max(5),
  comfort: z.number().int().min(0).max(5),      // guest comfort & accessibility
  decor: z.number().int().min(0).max(5),
  entertainment: z.number().int().min(0).max(5),
  photos: z.number().int().min(0).max(5),
});

export const EventSchema = z.object({
  occasion: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  venueType: z.enum(['home', 'hall', 'outdoor', 'restaurant', 'other']),
  region: z.string().max(80).optional(),          // context only
  culturalContext: z.string().max(200).optional(),
  budget: MoneySchema,
  weights: PriorityWeightsSchema,
  mealTypes: z.array(z.enum(['snacks', 'lunch', 'dinner', 'dessert', 'drinks'])).min(1),
  notes: z.string().max(500).optional(),
});

// ---------- Guests ----------
export const AgeBand = z.enum(['infant', 'child', 'teen', 'adult', 'senior']);
export const Dietary = z.enum(['vegetarian', 'vegan', 'jain', 'halal', 'kosher', 'gluten_free',
  'nut_allergy', 'dairy_free', 'diabetic_friendly', 'soft_food', 'other']);
export const Mobility = z.enum(['none', 'limited_walking', 'wheelchair', 'stroller']);
export const Sensory = z.enum(['none', 'low_vision', 'hard_of_hearing', 'noise_sensitive']);

export const TagConfidence = z.enum(['high', 'medium', 'low']);

export const GuestSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),            // NEVER sent to AI
  householdId: z.string().optional(),
  ageBand: AgeBand,
  dietary: z.array(Dietary),
  mobility: Mobility,
  sensory: Sensory,
  travel: z.enum(['local', 'out_of_town']),
  role: z.enum(['honoree', 'vip', 'helper', 'guest']),
  note: z.string().max(200).optional(),       // AI summary of free text, editable
  rsvp: z.enum(['invited', 'yes', 'no', 'maybe']),
  confidence: z.record(z.string(), TagConfidence).default({}), // per-field
  reviewed: z.boolean().default(false),
});

// ---------- Budget ----------
export const BudgetCategory = z.enum(['venue', 'food', 'decor', 'entertainment', 'photos',
  'rentals', 'misc']);
export const MoneySource = z.enum(['estimate', 'quote', 'confirmed']);

export const BudgetLineSchema = z.object({
  id: z.string(),
  category: BudgetCategory,
  label: z.string().max(80),
  amount: MoneySchema,
  source: MoneySource,
  perGuest: z.boolean(),        // scales with expected headcount
  vendorId: z.string().optional(),
});

// ---------- Vendors ----------
export const VendorSchema = z.object({
  id: z.string(),
  type: z.enum(['caterer', 'venue', 'decorator', 'photographer', 'entertainer', 'rentals',
    'baker', 'transport', 'other']),
  name: z.string().max(80),
  contact: z.string().max(120).optional(),
  questions: z.array(z.object({ text: z.string(), answer: z.string().optional() })),
  quotes: z.array(z.object({
    amount: MoneySchema, inclusions: z.string().max(500), validUntil: z.string().optional(),
    status: z.enum(['received', 'negotiating', 'accepted', 'rejected']),
  })),
});

// ---------- Helpers ----------
export const HelperSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  phone: z.string().max(20).optional(),
  availableFrom: z.string().datetime().optional(),
  availableTo: z.string().datetime().optional(),
  brief: z.string().max(600).optional(),
});

// ---------- Prep tasks ----------
export const PrepTaskSchema = z.object({
  id: z.string(),
  title: z.string().max(100),
  category: BudgetCategory.or(z.enum(['guests', 'logistics', 'accessibility'])),
  durationDays: z.number().int().min(0).max(60),
  latestStartDaysBefore: z.number().int().min(0).max(365),
  dependsOn: z.array(z.string()),
  ownerId: z.string().optional(),     // helper id or 'organizer'
  status: z.enum(['todo', 'doing', 'done', 'slipped']),
  slipDays: z.number().int().min(0).default(0),
  needTrigger: z.string().optional(), // e.g. 'mobility:wheelchair' — why this task exists
});
// Derived (engine/schedule.ts, not stored): startDate, dueDate, isCritical, isAtRisk, isBlocked

// ---------- Run sheet ----------
export const GuestConstraintSchema = z.object({
  id: z.string(),
  kind: z.enum(['must_start_before', 'must_end_before', 'must_not_overlap', 'max_wait']),
  segmentId: z.string(),
  minutesFromStart: z.number().int().optional(), // for before-constraints
  otherSegmentId: z.string().optional(),
  reason: z.string().max(120),        // "Seniors eat lunch before 13:30"
  needGroup: z.string(),              // 'senior', 'child', 'diabetic_friendly'...
  severity: z.enum(['hard', 'soft']),
});

export const SegmentSchema = z.object({
  id: z.string(),
  title: z.string().max(80),
  offsetMin: z.number().int().min(0),      // minutes from event start
  durationMin: z.number().int().min(1).max(600),
  minDurationMin: z.number().int().min(1), // can shrink to this during recovery
  ownerId: z.string().optional(),
  cue: z.string().max(200),                // what the owner does
  priority: PriorityWeightsSchema.keyof(), // which weight this segment serves
  locked: z.boolean().default(false),
  status: z.enum(['upcoming', 'live', 'done', 'skipped']),
  optional: z.boolean(),                   // can be dropped in recovery
});

export const RunSheetSchema = z.object({
  segments: z.array(SegmentSchema),
  constraints: z.array(GuestConstraintSchema),
  delayLog: z.array(z.object({ at: z.string().datetime(), minutes: z.number().int(), note: z.string() })),
});

// ---------- Recovery (AI output, validated) ----------
export const RecoveryOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('shorten'), segmentId: z.string(), byMin: z.number().int().min(1) }),
  z.object({ op: z.literal('drop'), segmentId: z.string() }),
  z.object({ op: z.literal('swap'), a: z.string(), b: z.string() }),
  z.object({ op: z.literal('moveBefore'), segmentId: z.string(), beforeId: z.string() }),
]);
export const RecoveryOptionSchema = z.object({
  label: z.string().max(60),
  rationale: z.string().max(240),
  ops: z.array(RecoveryOpSchema).min(1).max(6),
});

// ---------- Menu (added in build Phase 2 for the coverage matrix, PRD F3) ----------
export const DishSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  course: z.enum(['main', 'side', 'dessert', 'snack']),
  suitableFor: z.array(Dietary),   // vegan ⇒ vegetarian & dairy_free, jain ⇒ vegetarian (engine)
});

// ---------- Versions ----------
export const VersionSchema = z.object({
  id: z.string(), at: z.string().datetime(), reason: z.string().max(80),
  snapshot: z.unknown(), // PersistedState, validated on restore
});

// ---------- Persisted root ----------
export const PersistedStateSchema = z.object({
  schemaVersion: z.literal(1),
  event: EventSchema.optional(),
  guests: z.array(GuestSchema),
  budget: z.array(BudgetLineSchema),
  vendors: z.array(VendorSchema),
  helpers: z.array(HelperSchema),
  tasks: z.array(PrepTaskSchema),
  runSheet: RunSheetSchema.optional(),
  checklist: z.array(z.object({ id: z.string(), text: z.string(), trigger: z.string(), done: z.boolean() })),
  maybeProbability: z.number().min(0).max(1).default(0.5),
  quantityOverrides: z.record(z.string(), z.number()).default({}),
  menu: z.array(DishSchema).default([]),
});
// Version history is stored next to the plan as `versions: Version[]` (max 20) and validated
// with its own schema on load; snapshots are re-validated with PersistedStateSchema on restore.
```

## Engine outputs (derived, never persisted)

```ts
type Headcount = { confirmed: number; expected: number; byBand: Record<AgeBand, number> };
type QuantityLine = { item: string; unit: 'kg' | 'L' | 'pcs' | 'portions'; amount: number;
                      basis: string /* human-readable formula */ };
type CoverageCell = { group: Dietary; dishes: number; required: number; ok: boolean };
type SeatingZone = { id: string; label: string; seats: number; guestIds: string[]; reasons: string[] };
type BudgetSummary = { total: Money; allocated: Money; remaining: Money; perGuest: Money;
                       byCategory: Record<BudgetCategory, { amount: Money; sources: MoneySource[] }> };
type ScheduledTask = PrepTask & { start: string; due: string; isCritical: boolean;
                                   isAtRisk: boolean; isBlocked: boolean };
type ShiftResult = { segments: Segment[]; breaks: { constraintId: string; byMin: number }[] };
type RankedRecovery = RecoveryOption & { score: number; breaksFixed: number; minutesLost: number;
                                         impact: string[] };
```

## Engine heuristics (`src/engine/constants.ts`)
All values are **planning heuristics, shown to the user as editable assumptions**, never as facts.

| Constant | Default | Note |
|---|---|---|
| Portion multiplier by band | infant 0, child 0.5, teen 1.0, adult 1.0, senior 0.8 | of an adult portion |
| Mains per adult portion | 350 g | lunch/dinner |
| Snacks per adult per hour | 4 pcs | capped at 3 h |
| Drinks per adult per hour | 0.4 L | +30 % if outdoor |
| Buffer | +10 % | rounding up |
| Dishes per dietary group | ≥ 2 mains | group size ≥ 1 |
| Seats per table | 8 | editable |
| Maybe RSVP probability | 0.5 | editable |

## Recovery ranking (engine/recovery.ts)
```
score = Σ hardBreaksFixed × 100
      + Σ softBreaksFixed × 20
      − Σ over dropped/shortened segments (weight[segment.priority] × minutesLost)
      − 50 × (any segment shortened below minDuration → option discarded instead)
```
Options that leave any **hard** break unfixed are shown last with a warning.
