import type { AiOutput, IntakeField } from '../shared/aiTasks';

type IntakeQuestion = Required<Omit<AiOutput<'intakeNext'>, 'options'>> & { options?: string[] };

/**
 * Static intake order used when the AI is unavailable (PRD F1 AC). The app stays fully usable.
 * Conditional questions are skipped by `nextFallbackQuestion` when they don't apply.
 */
export const FALLBACK_INTAKE: IntakeQuestion[] = [
  {
    done: false,
    field: 'occasion',
    inputType: 'text',
    question: 'What are you celebrating?',
    why: 'The occasion shapes the tasks, run sheet and wording.',
  },
  {
    done: false,
    field: 'startsAt',
    inputType: 'datetime',
    question: 'When does it start?',
    why: 'Every deadline is scheduled backwards from this.',
  },
  {
    done: false,
    field: 'endsAt',
    inputType: 'datetime',
    question: 'When does it end?',
    why: 'Duration drives food, drinks and the run sheet.',
  },
  {
    done: false,
    field: 'venueType',
    inputType: 'single_choice',
    options: ['Home', 'Hall', 'Outdoor', 'Restaurant', 'Other'],
    question: 'Where will it be held?',
    why: 'Venue type changes seating, accessibility and weather planning.',
  },
  {
    done: false,
    field: 'weatherBackup',
    inputType: 'single_choice',
    options: ['Yes, indoor backup', 'Tents or cover', 'No backup yet'],
    question: 'Is there a backup if the weather turns?',
    why: 'Outdoor events need a plan B for rain or heat.',
  },
  {
    done: false,
    field: 'guestCountRough',
    inputType: 'number',
    question: 'Roughly how many guests?',
    why: 'A first estimate until the guest list is in.',
  },
  {
    done: false,
    field: 'budget',
    inputType: 'money',
    question: 'What is the total budget?',
    why: 'Splits into categories by your priorities.',
  },
  {
    done: false,
    field: 'mealTypes',
    inputType: 'multi_choice',
    options: ['Snacks', 'Lunch', 'Dinner', 'Dessert', 'Drinks'],
    question: 'What will you serve?',
    why: 'Quantities are calculated per meal type.',
  },
  {
    done: false,
    field: 'culturalContext',
    inputType: 'text',
    question: 'Any cultural or religious traditions to respect? (optional)',
    why: 'Helps tailor tasks, food and the run sheet.',
  },
  {
    done: false,
    field: 'weights',
    inputType: 'weights',
    question: 'What matters most to you?',
    why: 'Used to split the budget and to decide what to protect if the day runs late.',
  },
];

/**
 * Next static question not yet asked; weather backup only for outdoor venues.
 * @example nextFallbackQuestion(['occasion'], {}).field // 'startsAt'
 */
export function nextFallbackQuestion(
  asked: IntakeField[],
  answers: Partial<Record<IntakeField, unknown>>,
): IntakeQuestion | { done: true } {
  const outdoor = String(answers.venueType ?? '').toLowerCase() === 'outdoor';
  const next = FALLBACK_INTAKE.find(
    (q) => !asked.includes(q.field) && (q.field !== 'weatherBackup' || outdoor),
  );
  return next ?? { done: true };
}

/** Static checklist wording per trigger (AI_PROMPTS `checklist` fallback). */
export const FALLBACK_CHECKLIST: Record<string, string[]> = {
  'mobility:wheelchair': [
    'Confirm a step-free route from drop-off to seating',
    'Check an accessible restroom is available',
    'Reserve table spaces without chairs for wheelchairs',
  ],
  'mobility:limited_walking': [
    'Seat guests with limited walking close to the entrance',
    'Provide chairs with armrests',
  ],
  'mobility:stroller': ['Set aside space to park strollers near the family zone'],
  'sensory:low_vision': ['Light the paths and steps well', 'Print key signs in large type'],
  'sensory:hard_of_hearing': [
    'Seat guests who are hard of hearing near the speaker, away from music',
    'Have a microphone for speeches',
  ],
  'sensory:noise_sensitive': ['Plan a quiet corner away from speakers'],
  'age:infant': ['Arrange a private space for feeding and changing'],
  'age:child': ['Set up a supervised kids’ corner', 'Child-proof the play area'],
  'age:senior': ['Serve seniors first and on time', 'Keep seating in the shade and near restrooms'],
  'diet:nut_allergy': [
    'Label dishes that contain nuts',
    'Ask the caterer about cross-contamination',
  ],
  'diet:diabetic_friendly': [
    'Plan sugar-free dessert portions',
    'Keep meal timing predictable for diabetic guests',
  ],
  'travel:out_of_town': [
    'Send directions and parking details to out-of-town guests',
    'Share nearby stay options',
  ],
  'venue:outdoor': [
    'Confirm an indoor or covered backup for rain or heat',
    'Arrange drinking water and shade',
  ],
};

/**
 * Checklist items for the given triggers from the static map.
 * @example fallbackChecklist(['venue:outdoor']).items.length // 2
 */
export function fallbackChecklist(triggers: string[]): AiOutput<'checklist'> {
  return {
    items: triggers.flatMap((trigger) =>
      (FALLBACK_CHECKLIST[trigger] ?? []).map((text) => ({ trigger, text })),
    ),
  };
}

type FallbackTask = AiOutput<'prepTasks'>['tasks'][number];

/** Generic prep tasks when the AI is unavailable; need-specific ones are added by trigger. */
const BASE_TASKS: FallbackTask[] = [
  {
    key: 'venue',
    title: 'Confirm the venue booking',
    category: 'venue',
    durationDays: 2,
    latestStartDaysBefore: 28,
    dependsOn: [],
    ownerRole: 'organizer',
  },
  {
    key: 'invites',
    title: 'Send invitations',
    category: 'guests',
    durationDays: 2,
    latestStartDaysBefore: 25,
    dependsOn: [],
    ownerRole: 'organizer',
  },
  {
    key: 'rsvps',
    title: 'Chase RSVPs',
    category: 'guests',
    durationDays: 5,
    latestStartDaysBefore: 14,
    dependsOn: ['invites'],
    ownerRole: 'organizer',
  },
  {
    key: 'menu',
    title: 'Finalise the menu with dietary options',
    category: 'food',
    durationDays: 3,
    latestStartDaysBefore: 12,
    dependsOn: ['rsvps'],
    ownerRole: 'organizer',
  },
  {
    key: 'rentals',
    title: 'Book chairs, tables and rentals',
    category: 'rentals',
    durationDays: 2,
    latestStartDaysBefore: 10,
    dependsOn: ['rsvps'],
    ownerRole: 'organizer',
  },
  {
    key: 'decor',
    title: 'Plan and buy decorations',
    category: 'decor',
    durationDays: 3,
    latestStartDaysBefore: 8,
    dependsOn: ['venue'],
    ownerRole: 'helper',
  },
  {
    key: 'seating',
    title: 'Draft the seating plan',
    category: 'guests',
    durationDays: 1,
    latestStartDaysBefore: 4,
    dependsOn: ['rsvps', 'rentals'],
    ownerRole: 'helper',
  },
  {
    key: 'briefs',
    title: 'Brief helpers and print cue cards',
    category: 'logistics',
    durationDays: 1,
    latestStartDaysBefore: 2,
    dependsOn: ['seating'],
    ownerRole: 'organizer',
  },
];

const NEED_TASKS: Record<string, FallbackTask> = {
  'mobility:wheelchair': {
    key: 'step-free',
    title: 'Confirm step-free entry and accessible restroom',
    category: 'accessibility',
    durationDays: 1,
    latestStartDaysBefore: 10,
    dependsOn: ['venue'],
    ownerRole: 'helper',
    needTrigger: 'mobility:wheelchair',
  },
  'diet:diabetic_friendly': {
    key: 'sugar-free',
    title: 'Arrange sugar-free dessert options',
    category: 'food',
    durationDays: 1,
    latestStartDaysBefore: 7,
    dependsOn: ['menu'],
    ownerRole: 'organizer',
    needTrigger: 'diet:diabetic_friendly',
  },
  'travel:out_of_town': {
    key: 'travel-info',
    title: 'Send travel and stay info to out-of-town guests',
    category: 'logistics',
    durationDays: 1,
    latestStartDaysBefore: 14,
    dependsOn: ['invites'],
    ownerRole: 'organizer',
    needTrigger: 'travel:out_of_town',
  },
  'age:child': {
    key: 'kids-corner',
    title: 'Prepare a kids’ corner',
    category: 'entertainment',
    durationDays: 2,
    latestStartDaysBefore: 5,
    dependsOn: [],
    ownerRole: 'helper',
    needTrigger: 'age:child',
  },
};

/**
 * Default prep tasks plus need-triggered ones, clamped to the days remaining.
 * @example fallbackPrepTasks(['mobility:wheelchair'], 30).tasks.some((t) => t.needTrigger) // true
 */
export function fallbackPrepTasks(
  needKeys: string[],
  daysUntilEvent: number,
): AiOutput<'prepTasks'> {
  const extra = needKeys.flatMap((k) => (NEED_TASKS[k] ? [NEED_TASKS[k]] : []));
  const clamp = (t: FallbackTask) => ({
    ...t,
    latestStartDaysBefore: Math.min(t.latestStartDaysBefore, Math.max(0, daysUntilEvent)),
  });
  return {
    tasks: [...BASE_TASKS, ...extra].map(clamp),
    assumptions: ['Generic task list used because the assistant was unavailable.'],
  };
}
