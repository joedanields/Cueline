import { addDays, addHours, setHours, startOfDay } from 'date-fns';
import {
  SCHEMA_VERSION,
  type BudgetLine,
  type Helper,
  type PersistedState,
  type PrepTask,
  type RunSheet,
  type Vendor,
} from '../shared/schemas';
import { buildDemoGuests } from './demoGuests';

const DAYS_UNTIL_EVENT = 21;
const START_HOUR = 12;
const DURATION_HOURS = 4;
const INR = 'INR';
const rupees = (n: number) => ({ amount: n * 100, currency: INR });

const HELPERS: Helper[] = [
  { id: 'h_priya', name: 'Priya' },
  { id: 'h_arjun', name: 'Arjun' },
  { id: 'h_meera', name: 'Meera' },
  { id: 'h_kabir', name: 'Kabir' },
];

const VENDORS: Vendor[] = [
  { id: 'v_caterer', type: 'caterer', name: 'Annapurna Caterers', questions: [], quotes: [] },
  {
    id: 'v_baker',
    type: 'baker',
    name: 'Sweet Crumbs Bakery',
    questions: [{ text: 'Can you make a sugar-free version of the cake for 3 guests?' }],
    quotes: [{ amount: rupees(4500), inclusions: '3 kg eggless cake + sugar-free mini cake', status: 'received' }],
  },
  {
    id: 'v_photo',
    type: 'photographer',
    name: 'Lens & Light',
    questions: [],
    quotes: [{ amount: rupees(15000), inclusions: '4 hours, 200 edited photos', status: 'accepted' }],
  },
];

const BUDGET: BudgetLine[] = [
  { id: 'b_venue', category: 'venue', label: 'Garden + indoor backup hall', amount: rupees(30000), source: 'confirmed', perGuest: false },
  { id: 'b_food', category: 'food', label: 'Lunch buffet (per guest)', amount: rupees(900), source: 'estimate', perGuest: true },
  { id: 'b_cake', category: 'food', label: 'Birthday cake', amount: rupees(4500), source: 'quote', perGuest: false, vendorId: 'v_baker' },
  { id: 'b_decor', category: 'decor', label: 'Flowers and shade decor', amount: rupees(12000), source: 'estimate', perGuest: false },
  { id: 'b_ent', category: 'entertainment', label: 'Kids’ corner + music', amount: rupees(8000), source: 'estimate', perGuest: false },
  { id: 'b_photo', category: 'photos', label: 'Photographer', amount: rupees(15000), source: 'confirmed', perGuest: false, vendorId: 'v_photo' },
  { id: 'b_rent', category: 'rentals', label: 'Chairs with armrests, ramp, tents', amount: rupees(10000), source: 'estimate', perGuest: false },
  { id: 'b_misc', category: 'misc', label: 'Contingency', amount: rupees(5000), source: 'estimate', perGuest: false },
];

type TaskSpec = [id: string, title: string, category: PrepTask['category'], durationDays: number,
  latestStartDaysBefore: number, dependsOn: string[], extra?: Partial<PrepTask>];

const TASK_SPECS: TaskSpec[] = [
  ['t_venue', 'Confirm garden booking and indoor backup hall', 'venue', 1, 28, [], { status: 'done' }],
  ['t_invites', 'Send invitations', 'guests', 2, 25, [], { status: 'done' }],
  ['t_rsvp', 'Chase RSVPs', 'guests', 5, 14, ['t_invites'], { status: 'doing' }],
  ['t_travel', 'Share directions and stay options with out-of-town guests', 'logistics', 1, 12, ['t_invites'], { needTrigger: 'travel:out_of_town' }],
  ['t_slides', 'Collect photos for the memory slideshow', 'photos', 5, 12, [], { ownerId: 'h_priya' }],
  ['t_caterer', 'Finalise menu with vegetarian and diabetic-friendly dishes', 'food', 3, 12, ['t_rsvp']],
  ['t_ramp', 'Arrange portable ramp and step-free path to the garden', 'accessibility', 2, 10, ['t_venue'], { ownerId: 'h_arjun', needTrigger: 'mobility:wheelchair' }],
  ['t_rentals', 'Book chairs with armrests and shade tents', 'rentals', 2, 9, ['t_rsvp']],
  ['t_cake', 'Order cake with a sugar-free option', 'food', 1, 7, ['t_caterer'], { needTrigger: 'diet:diabetic_friendly' }],
  ['t_kids', 'Prepare kids’ corner games kit', 'entertainment', 2, 5, [], { ownerId: 'h_kabir' }],
  ['t_seating', 'Draft seating plan (seniors near restroom and shade)', 'guests', 1, 4, ['t_rsvp', 't_rentals'], { ownerId: 'h_priya' }],
  ['t_briefs', 'Brief helpers and print cue cards', 'logistics', 1, 2, ['t_seating']],
];

const TASKS: PrepTask[] = TASK_SPECS.map(([id, title, category, durationDays, latestStartDaysBefore, dependsOn, extra]) => ({
  id, title, category, durationDays, latestStartDaysBefore, dependsOn, status: 'todo', slipDays: 0, ownerId: 'organizer', ...extra,
}));

const seg = (id: string, title: string, offsetMin: number, durationMin: number, minDurationMin: number,
  ownerId: string, cue: string, priority: RunSheet['segments'][number]['priority'], optional: boolean) => ({
  id, title, offsetMin, durationMin, minDurationMin, ownerId, cue, priority, optional, locked: false, status: 'upcoming' as const,
});

const RUN_SHEET: RunSheet = {
  segments: [
    seg('s_arrive', 'Welcome and seating', 0, 30, 20, 'h_arjun', 'Guide wheelchair users via the side-gate ramp; seat seniors in the shade first.', 'comfort', false),
    seg('s_toast', 'Family welcome and toast', 30, 15, 10, 'organizer', 'Short welcome; hand the mic to Grandma.', 'entertainment', false),
    seg('s_cake', 'Cake cutting and song', 45, 20, 10, 'h_priya', 'Bring cake and the sugar-free mini cake to the honoree table.', 'photos', false),
    seg('s_lunch', 'Lunch service', 65, 60, 45, 'h_meera', 'Serve seniors and diabetic-friendly plates first at their tables.', 'food', false),
    seg('s_kids', 'Kids’ garden games', 125, 30, 15, 'h_kabir', 'Start games in the kids’ corner away from the seniors’ zone.', 'entertainment', true),
    seg('s_photos', 'Family group photos', 155, 30, 15, 'h_priya', 'Call families by household; seniors seated in front row.', 'photos', true),
    seg('s_slides', 'Memory slideshow and speeches', 185, 35, 20, 'organizer', 'Dim the hall screen; keep speeches to 3 minutes each.', 'entertainment', true),
    seg('s_farewell', 'Farewell and take-home sweets', 220, 20, 10, 'h_meera', 'Hand out sweet boxes; help seniors to cars first.', 'comfort', false),
  ],
  constraints: [
    { id: 'c_senior_lunch', kind: 'must_start_before', segmentId: 's_lunch', minutesFromStart: 80, reason: 'Seniors eat lunch by 13:20', needGroup: 'senior', severity: 'hard' },
    { id: 'c_diabetic', kind: 'must_start_before', segmentId: 's_lunch', minutesFromStart: 90, reason: 'Diabetic guests need a meal by 13:30', needGroup: 'diabetic_friendly', severity: 'hard' },
    { id: 'c_kids', kind: 'must_end_before', segmentId: 's_kids', minutesFromStart: 165, reason: 'Kids’ games end before nap time (14:45)', needGroup: 'child', severity: 'soft' },
  ],
  delayLog: [],
};

/**
 * PRD §5 demo: "Grandpa's 75th birthday lunch", dated relative to `now` so it is always upcoming.
 * @example buildDemoState(new Date()).guests.length // 62
 */
export function buildDemoState(now: Date): PersistedState {
  const startsAt = setHours(startOfDay(addDays(now, DAYS_UNTIL_EVENT)), START_HOUR);
  return {
    schemaVersion: SCHEMA_VERSION,
    event: {
      occasion: 'Birthday',
      title: 'Grandpa’s 75th birthday lunch',
      startsAt: startsAt.toISOString(),
      endsAt: addHours(startsAt, DURATION_HOURS).toISOString(),
      venueType: 'outdoor',
      region: 'Pune, India',
      culturalContext: 'North Indian Hindu family; elders are served first; Hindi and English',
      budget: rupees(150000),
      weights: { food: 4, comfort: 5, decor: 2, entertainment: 3, photos: 3 },
      mealTypes: ['snacks', 'lunch', 'dessert', 'drinks'],
      notes: 'Garden venue with an indoor hall as weather backup.',
    },
    guests: buildDemoGuests(),
    budget: BUDGET,
    vendors: VENDORS,
    helpers: HELPERS,
    tasks: TASKS,
    runSheet: RUN_SHEET,
    checklist: [],
    maybeProbability: 0.5,
    quantityOverrides: {},
  };
}
