import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  BudgetLineSchema,
  EventSchema,
  GuestConstraintSchema,
  GuestSchema,
  HelperSchema,
  MoneySchema,
  PersistedStateSchema,
  PrepTaskSchema,
  PriorityWeightsSchema,
  RecoveryOpSchema,
  RecoveryOptionSchema,
  RunSheetSchema,
  SegmentSchema,
  VendorSchema,
  VersionSchema,
  emptyPersistedState,
} from './index';
import {
  makeConstraint,
  makeGuest,
  makeSegment,
  makeTask,
  validBudgetLine,
  validEvent,
  validHelper,
  validVendor,
} from '../../../tests/fixtures/state';

type Case = { name: string; schema: z.ZodType; valid: unknown; invalid: unknown[] };

const cases: Case[] = [
  {
    name: 'Money',
    schema: MoneySchema,
    valid: { amount: 1050, currency: 'USD' },
    invalid: [
      { amount: 10.5, currency: 'USD' },
      { amount: -1, currency: 'USD' },
      { amount: 1, currency: 'usd' },
    ],
  },
  {
    name: 'PriorityWeights',
    schema: PriorityWeightsSchema,
    valid: validEvent.weights,
    invalid: [
      { ...validEvent.weights, food: 6 },
      { ...validEvent.weights, decor: 2.5 },
    ],
  },
  {
    name: 'Event',
    schema: EventSchema,
    valid: validEvent,
    invalid: [
      { ...validEvent, occasion: '' },
      { ...validEvent, startsAt: 'next tuesday' },
      { ...validEvent, venueType: 'castle' },
      { ...validEvent, mealTypes: [] },
    ],
  },
  {
    name: 'Guest',
    schema: GuestSchema,
    valid: makeGuest(),
    invalid: [
      makeGuest({ name: '' }),
      { ...makeGuest(), ageBand: 'elder' },
      { ...makeGuest(), dietary: ['paleo'] },
      { ...makeGuest(), rsvp: 'perhaps' },
      { ...makeGuest(), confidence: { ageBand: 'sure' } },
    ],
  },
  {
    name: 'BudgetLine',
    schema: BudgetLineSchema,
    valid: validBudgetLine,
    invalid: [
      { ...validBudgetLine, source: 'guess' },
      { ...validBudgetLine, category: 'travel' },
    ],
  },
  {
    name: 'Vendor',
    schema: VendorSchema,
    valid: validVendor,
    invalid: [
      { ...validVendor, type: 'wizard' },
      { ...validVendor, quotes: [{ status: 'received' }] },
    ],
  },
  {
    name: 'Helper',
    schema: HelperSchema,
    valid: validHelper,
    invalid: [
      { ...validHelper, name: '' },
      { ...validHelper, availableFrom: 'soon' },
    ],
  },
  {
    name: 'PrepTask',
    schema: PrepTaskSchema,
    valid: makeTask(),
    invalid: [makeTask({ durationDays: -1 }), { ...makeTask(), status: 'blocked' }],
  },
  {
    name: 'GuestConstraint',
    schema: GuestConstraintSchema,
    valid: makeConstraint(),
    invalid: [
      { ...makeConstraint(), kind: 'before' },
      { ...makeConstraint(), severity: 'medium' },
    ],
  },
  {
    name: 'Segment',
    schema: SegmentSchema,
    valid: makeSegment(),
    invalid: [makeSegment({ durationMin: 0 }), { ...makeSegment(), priority: 'music' }],
  },
  {
    name: 'RunSheet',
    schema: RunSheetSchema,
    valid: { segments: [makeSegment()], constraints: [makeConstraint()], delayLog: [] },
    invalid: [{ segments: [], constraints: [] }],
  },
  {
    name: 'RecoveryOp',
    schema: RecoveryOpSchema,
    valid: { op: 'shorten', segmentId: 's_1', byMin: 5 },
    invalid: [
      { op: 'shorten', segmentId: 's_1', byMin: 0 },
      { op: 'teleport', segmentId: 's_1' },
    ],
  },
  {
    name: 'RecoveryOption',
    schema: RecoveryOptionSchema,
    valid: { label: 'Swap', rationale: 'Because', ops: [{ op: 'drop', segmentId: 's_1' }] },
    invalid: [{ label: 'Nothing', rationale: 'x', ops: [] }],
  },
  {
    name: 'Version',
    schema: VersionSchema,
    valid: { id: 'ver_1', at: '2030-01-01T00:00:00Z', reason: 'x', snapshot: {} },
    invalid: [{ id: 'ver_1', at: 'yesterday', reason: 'x', snapshot: {} }],
  },
  {
    name: 'PersistedState',
    schema: PersistedStateSchema,
    valid: { ...emptyPersistedState(), event: validEvent, guests: [makeGuest()] },
    invalid: [
      { ...emptyPersistedState(), schemaVersion: 2 },
      { ...emptyPersistedState(), guests: 'none' },
    ],
  },
];

describe.each(cases)('$name schema', ({ schema, valid, invalid }) => {
  it('accepts a valid fixture', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it.each(invalid.map((value, i) => [i, value]))('rejects invalid fixture #%i', (_i, value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});

describe('schema defaults', () => {
  it('fills guest confidence and reviewed defaults', () => {
    const { confidence: _c, reviewed: _r, ...bare } = makeGuest();
    const parsed = GuestSchema.parse(bare);
    expect(parsed.confidence).toEqual({});
    expect(parsed.reviewed).toBe(false);
  });

  it('fills persisted maybeProbability and overrides defaults', () => {
    const { maybeProbability: _m, quantityOverrides: _q, ...bare } = emptyPersistedState();
    const parsed = PersistedStateSchema.parse(bare);
    expect(parsed.maybeProbability).toBe(0.5);
    expect(parsed.quantityOverrides).toEqual({});
  });

  it('caps persisted collection sizes', () => {
    const guests = Array.from({ length: 501 }, (_, i) => makeGuest({ id: `g_${i}` }));
    expect(PersistedStateSchema.safeParse({ ...emptyPersistedState(), guests }).success).toBe(
      false,
    );
  });
});
