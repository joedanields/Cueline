import type { AiOutput } from '../shared/aiTasks';

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
