import type { Guest, VenueType } from '../shared/schemas';

export type NeedGroup = { key: string; label: string; count: number; guestIds: string[] };

type Def = { key: string; label: string; match: (g: Guest) => boolean };

const LABELS: Record<string, string> = {
  'age:senior': 'Seniors', 'age:child': 'Children', 'age:infant': 'Infants', 'age:teen': 'Teens',
  'diet:vegetarian': 'Vegetarian', 'diet:vegan': 'Vegan', 'diet:jain': 'Jain', 'diet:halal': 'Halal',
  'diet:kosher': 'Kosher', 'diet:gluten_free': 'Gluten-free', 'diet:nut_allergy': 'Nut allergy',
  'diet:dairy_free': 'Dairy-free', 'diet:diabetic_friendly': 'Diabetic-friendly', 'diet:soft_food': 'Soft food',
  'diet:other': 'Other diet', 'mobility:wheelchair': 'Wheelchair users', 'mobility:limited_walking': 'Limited walking',
  'mobility:stroller': 'Strollers', 'sensory:low_vision': 'Low vision', 'sensory:hard_of_hearing': 'Hard of hearing',
  'sensory:noise_sensitive': 'Noise-sensitive', 'travel:out_of_town': 'Out-of-town',
};

/**
 * Human label for a need key.
 * @example needLabel('mobility:wheelchair') // 'Wheelchair users'
 */
export function needLabel(key: string): string {
  return LABELS[key] ?? key;
}

const DEFS: Def[] = Object.keys(LABELS).map((key) => {
  const [field, value] = key.split(':') as [string, string];
  const match = (g: Guest): boolean => {
    if (field === 'age') return g.ageBand === value;
    if (field === 'diet') return g.dietary.some((d) => d === value);
    if (field === 'mobility') return g.mobility === value;
    if (field === 'sensory') return g.sensory === value;
    return g.travel === value;
  };
  return { key, label: LABELS[key] ?? key, match };
});

/**
 * Need groups with at least one member, largest first. Pass only planned guests (not "no").
 * @example computeNeedGroups(guests)[0] // { key: 'diet:vegetarian', label: 'Vegetarian', count: 14, ... }
 */
export function computeNeedGroups(guests: Guest[]): NeedGroup[] {
  return DEFS.map((d) => {
    const guestIds = guests.filter(d.match).map((g) => g.id);
    return { key: d.key, label: d.label, count: guestIds.length, guestIds };
  })
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * Counts per need key — the anonymous summary sent to AI tasks (no names, no ids).
 * @example needSummary(groups) // { 'age:senior': 11, 'mobility:wheelchair': 2 }
 */
export function needSummary(groups: NeedGroup[]): Record<string, number> {
  return Object.fromEntries(groups.map((g) => [g.key, g.count]));
}

/** Need keys that trigger accessibility/comfort checklist items. */
const CHECKLIST_KEYS = new Set([
  'mobility:wheelchair', 'mobility:limited_walking', 'mobility:stroller', 'sensory:low_vision',
  'sensory:hard_of_hearing', 'sensory:noise_sensitive', 'age:infant', 'age:senior', 'age:child',
  'diet:nut_allergy', 'diet:diabetic_friendly', 'travel:out_of_town',
]);

/**
 * Deterministic checklist triggers: which needs are present, plus the venue (outdoor ⇒ weather).
 * The AI only writes wording for these; it never decides which apply.
 * @example checklistTriggers(groups, 'outdoor') // ['mobility:wheelchair', ..., 'venue:outdoor']
 */
export function checklistTriggers(groups: NeedGroup[], venueType: VenueType | undefined): string[] {
  const triggers = groups.map((g) => g.key).filter((k) => CHECKLIST_KEYS.has(k)).sort();
  if (venueType === 'outdoor') triggers.push('venue:outdoor');
  return triggers;
}
