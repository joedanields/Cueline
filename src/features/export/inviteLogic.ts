import { format } from 'date-fns';
import type { CelebrationEvent } from '../../shared/schemas';

/** Practical details that matter to each need group — chosen by code, worded by the AI. */
const SPECIFICS: Record<string, string[]> = {
  'mobility:wheelchair': ['Step-free route from drop-off to seating', 'Accessible restroom on site'],
  'mobility:limited_walking': ['Seating close to the entrance', 'Chairs with armrests'],
  'mobility:stroller': ['Space to park strollers near the family area'],
  'age:senior': ['Shaded seating near restrooms', 'Lunch served to seniors first'],
  'age:child': ['A supervised kids’ corner'],
  'age:infant': ['A quiet space for feeding and changing'],
  'diet:vegetarian': ['Clearly labelled vegetarian dishes'],
  'diet:vegan': ['Clearly labelled vegan dishes'],
  'diet:diabetic_friendly': ['Sugar-free dessert options'],
  'diet:nut_allergy': ['Dishes labelled for nuts'],
  'sensory:hard_of_hearing': ['Seating near the speaker, away from music'],
  'sensory:low_vision': ['Well-lit paths and large-print signs'],
  'travel:out_of_town': ['Directions, parking and nearby stay options will follow'],
};

/**
 * Details to mention for a group, plus the outdoor backup when relevant.
 * @example groupSpecifics('age:senior', 'outdoor').length // 3
 */
export function groupSpecifics(groupKey: string, venueType: CelebrationEvent['venueType']): string[] {
  const base = SPECIFICS[groupKey] ?? [];
  return venueType === 'outdoor' ? [...base, 'Covered backup if the weather turns'] : base;
}

/**
 * Fill `{date}` / `{time}` placeholders client-side (the AI never sees the real date format).
 * @example fillPlaceholders('See you {date} at {time}', event) // 'See you Sunday 21 June at 12:00'
 */
export function fillPlaceholders(text: string, event: Pick<CelebrationEvent, 'startsAt'>): string {
  const d = new Date(event.startsAt);
  return text.replace(/\{date\}/g, format(d, 'EEEE d MMMM')).replace(/\{time\}/g, format(d, 'HH:mm'));
}

/**
 * Template invite when the AI is unavailable.
 * @example fallbackInvite(event, ['Step-free entrance'])
 */
export function fallbackInvite(event: Pick<CelebrationEvent, 'title'>, specifics: string[]): string {
  const extra = specifics.length ? ` For your comfort: ${specifics.join('; ')}.` : '';
  return `You're invited to ${event.title} on {date} at {time}. We'd love to celebrate with you.${extra} Please let us know if you can come.`;
}
