import type { Dietary, Dish, Guest } from '../shared/schemas';
import { DIET_SATISFIES, MIN_MAINS_PER_DIET_GROUP } from './constants';

export type CoverageCell = {
  group: Dietary;
  members: number;
  dishes: number;
  required: number;
  ok: boolean;
  /** Names of the mains that satisfy this group. */
  dishNames: string[];
};

/**
 * All dietary groups a dish satisfies, expanding implications (vegan ⇒ vegetarian, jain ⇒ vegetarian).
 * @example dishSatisfies({ suitableFor: ['vegan'] }) // Set { 'vegan', 'vegetarian', 'dairy_free' }
 */
export function dishSatisfies(dish: Pick<Dish, 'suitableFor'>): Set<Dietary> {
  const out = new Set<Dietary>();
  for (const tag of dish.suitableFor) {
    out.add(tag);
    for (const implied of DIET_SATISFIES[tag] ?? []) out.add(implied);
  }
  return out;
}

/**
 * Menu coverage matrix: each dietary group with ≥ 1 planned guest needs ≥ N suitable mains.
 * Groups with no members are omitted; "other" can't be matched to dishes and is excluded.
 * @example computeMenuCoverage(guests, menu).filter((c) => !c.ok) // gaps to fix
 */
export function computeMenuCoverage(guests: Guest[], menu: Dish[]): CoverageCell[] {
  const members = new Map<Dietary, number>();
  for (const g of guests) {
    for (const d of new Set(g.dietary)) {
      if (d !== 'other') members.set(d, (members.get(d) ?? 0) + 1);
    }
  }
  const mains = menu.filter((d) => d.course === 'main').map((d) => ({ d, sat: dishSatisfies(d) }));
  return [...members.entries()]
    .map(([group, count]) => {
      const matching = mains.filter((m) => m.sat.has(group)).map((m) => m.d.name);
      return {
        group,
        members: count,
        dishes: matching.length,
        required: MIN_MAINS_PER_DIET_GROUP,
        ok: matching.length >= MIN_MAINS_PER_DIET_GROUP,
        dishNames: matching,
      };
    })
    .sort((a, b) => Number(a.ok) - Number(b.ok) || b.members - a.members);
}
