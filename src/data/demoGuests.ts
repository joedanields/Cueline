import type { AgeBand, Dietary, Guest, Mobility, Rsvp, Sensory } from '../shared/schemas';

type Spec = {
  name: string;
  band: AgeBand;
  diet?: Dietary[];
  mobility?: Mobility;
  sensory?: Sensory;
  away?: boolean;
  role?: Guest['role'];
  note?: string;
  low?: string[];
};

const V: Dietary[] = ['vegetarian'];
const D: Dietary[] = ['diabetic_friendly'];

// 11 seniors (2 wheelchair users), 3 diabetic-friendly overall.
const SENIORS: Spec[] = [
  { name: 'Mohan Sharma', band: 'senior', diet: D, mobility: 'limited_walking', role: 'honoree', note: 'Birthday honoree, uses a walking stick' },
  { name: 'Kamala Sharma', band: 'senior', diet: V, role: 'vip' },
  { name: 'Prakash Verma', band: 'senior', diet: D, mobility: 'wheelchair' },
  { name: 'Savitri Verma', band: 'senior', diet: ['vegetarian', 'diabetic_friendly'], sensory: 'hard_of_hearing' },
  { name: 'Raghav Iyer', band: 'senior', diet: V, mobility: 'wheelchair', away: true },
  { name: 'Lakshmi Iyer', band: 'senior', diet: V, away: true },
  { name: 'Harish Gupta', band: 'senior', mobility: 'limited_walking' },
  { name: 'Usha Gupta', band: 'senior', diet: V },
  { name: 'Bhaskar Rao', band: 'senior', low: ['ageBand'] },
  { name: 'Nirmala Rao', band: 'senior', diet: ['vegetarian', 'soft_food'] },
  { name: 'Gopal Mehta', band: 'senior', sensory: 'low_vision', low: ['sensory'] },
];

// 9 children; 2 vegetarian, 1 nut allergy, 2 travelling in.
const CHILDREN: Spec[] = [
  { name: 'Aarav Sharma', band: 'child' },
  { name: 'Diya Sharma', band: 'child', diet: V },
  { name: 'Ishaan Verma', band: 'child', diet: ['nut_allergy'] },
  { name: 'Anaya Verma', band: 'child', diet: V },
  { name: 'Vihaan Gupta', band: 'child', mobility: 'stroller' },
  { name: 'Myra Iyer', band: 'child', away: true },
  { name: 'Reyansh Iyer', band: 'child', away: true },
  { name: 'Saanvi Rao', band: 'child', sensory: 'noise_sensitive' },
  { name: 'Advik Mehta', band: 'child', low: ['ageBand'] },
];

const TEENS: Spec[] = [
  { name: 'Tanvi Sharma', band: 'teen', diet: V },
  { name: 'Rohan Gupta', band: 'teen' },
  { name: 'Zara Mehta', band: 'teen' },
];

const ADULT_FIRST = [
  'Priya', 'Arjun', 'Meera', 'Kabir', 'Anjali', 'Vikram', 'Neha', 'Rahul', 'Pooja', 'Sanjay',
  'Kavita', 'Amit', 'Ritu', 'Deepak', 'Sunita', 'Manish', 'Swati', 'Nikhil', 'Divya', 'Karan',
  'Shreya', 'Varun', 'Nisha', 'Rajesh', 'Asha', 'Suresh', 'Geeta', 'Ajay', 'Rekha', 'Vivek',
  'Sneha', 'Alok', 'Jyoti', 'Tarun', 'Pallavi', 'Mukesh', 'Ananya', 'Dev', 'Isha',
];
const SURNAMES = ['Sharma', 'Verma', 'Gupta', 'Iyer', 'Rao', 'Mehta', 'Kapoor', 'Nair'];

// 39 adults: the first four are the helpers; 5 vegetarian, 2 travelling in.
const ADULTS: Spec[] = ADULT_FIRST.map((first, i) => ({
  name: `${first} ${SURNAMES[i % SURNAMES.length] ?? 'Sharma'}`,
  band: 'adult' as const,
  diet: i % 8 === 3 ? V : undefined,
  away: i === 10 || i === 21,
  role: i < 4 ? ('helper' as const) : undefined,
}));

/** Deterministic RSVP spread: mostly yes, some maybe/invited/no. The honoree is always yes. */
function rsvpFor(i: number): Rsvp {
  if (i === 0) return 'yes';
  if (i % 9 === 4) return 'maybe';
  if (i % 13 === 7) return 'no';
  if (i % 11 === 5) return 'invited';
  return 'yes';
}

function toGuest(spec: Spec, i: number): Guest {
  const surname = spec.name.split(' ')[1] ?? 'guest';
  return {
    id: `g_demo${String(i + 1).padStart(3, '0')}`,
    name: spec.name,
    householdId: `hh_${surname.toLowerCase()}`,
    ageBand: spec.band,
    dietary: spec.diet ?? [],
    mobility: spec.mobility ?? 'none',
    sensory: spec.sensory ?? 'none',
    travel: spec.away ? 'out_of_town' : 'local',
    role: spec.role ?? 'guest',
    note: spec.note,
    rsvp: rsvpFor(i),
    confidence: Object.fromEntries((spec.low ?? []).map((field) => [field, 'low' as const])),
    reviewed: !spec.low,
  };
}

/** The 62 demo guests from PRD §5. */
export function buildDemoGuests(): Guest[] {
  return [...SENIORS, ...CHILDREN, ...TEENS, ...ADULTS].map(toGuest);
}
