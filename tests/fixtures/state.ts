import type {
  BudgetLine,
  CelebrationEvent,
  Guest,
  GuestConstraint,
  Helper,
  PrepTask,
  Segment,
  Vendor,
} from '../../src/shared/schemas';

/** Small, valid fixtures shared by schema, engine and UI tests. */
export const validEvent: CelebrationEvent = {
  occasion: 'Birthday',
  title: 'Test party',
  startsAt: '2030-06-01T12:00:00.000Z',
  endsAt: '2030-06-01T16:00:00.000Z',
  venueType: 'hall',
  budget: { amount: 10_000_000, currency: 'INR' },
  weights: { food: 4, comfort: 5, decor: 2, entertainment: 3, photos: 1 },
  mealTypes: ['lunch'],
};

export function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 'g_1',
    name: 'Asha',
    ageBand: 'adult',
    dietary: [],
    mobility: 'none',
    sensory: 'none',
    travel: 'local',
    role: 'guest',
    rsvp: 'yes',
    confidence: {},
    reviewed: true,
    ...overrides,
  };
}

export const validBudgetLine: BudgetLine = {
  id: 'b_1',
  category: 'food',
  label: 'Lunch',
  amount: { amount: 90_000, currency: 'INR' },
  source: 'estimate',
  perGuest: true,
};

export const validVendor: Vendor = {
  id: 'v_1',
  type: 'caterer',
  name: 'Caterer',
  questions: [{ text: 'Do you do vegan?' }],
  quotes: [{ amount: { amount: 100, currency: 'INR' }, inclusions: 'All', status: 'received' }],
};

export const validHelper: Helper = { id: 'h_1', name: 'Priya' };

export function makeTask(overrides: Partial<PrepTask> = {}): PrepTask {
  return {
    id: 't_1',
    title: 'Book venue',
    category: 'venue',
    durationDays: 1,
    latestStartDaysBefore: 10,
    dependsOn: [],
    status: 'todo',
    slipDays: 0,
    ...overrides,
  };
}

export function makeSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: 's_1',
    title: 'Lunch',
    offsetMin: 0,
    durationMin: 60,
    minDurationMin: 30,
    cue: 'Serve',
    priority: 'food',
    locked: false,
    status: 'upcoming',
    optional: false,
    ...overrides,
  };
}

export function makeConstraint(overrides: Partial<GuestConstraint> = {}): GuestConstraint {
  return {
    id: 'c_1',
    kind: 'must_start_before',
    segmentId: 's_1',
    minutesFromStart: 60,
    reason: 'Seniors eat early',
    needGroup: 'senior',
    severity: 'hard',
    ...overrides,
  };
}
