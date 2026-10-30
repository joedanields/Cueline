import type { AgeBand, BudgetCategory, Dietary, PriorityKey } from '../shared/schemas';

/*
 * Planning heuristics. Every value here is an editable ASSUMPTION shown to the user, never a fact.
 * Sources: common catering rules of thumb (docs/DATA_MODEL.md "Engine heuristics").
 */

/** Share of an adult portion eaten per age band — infants are fed separately. */
export const PORTION_MULTIPLIER: Record<AgeBand, number> = {
  infant: 0,
  child: 0.5,
  teen: 1,
  adult: 1,
  senior: 0.8,
};

/** Adult portion of mains per meal ≈ 350 g — planning heuristic, editable. */
export const MAINS_GRAMS_PER_ADULT = 350;
/** Snack pieces per adult per hour — planning heuristic. */
export const SNACKS_PER_ADULT_PER_HOUR = 4;
/** Snacks taper off after ~3 h; hours beyond this add no snacks. */
export const SNACK_HOURS_CAP = 3;
/** Drinks per adult per hour ≈ 0.4 L — planning heuristic. */
export const DRINK_LITRES_PER_ADULT_PER_HOUR = 0.4;
/** Outdoor events need ~30 % more drinks (heat, activity). */
export const OUTDOOR_DRINK_UPLIFT = 1.3;
/** Safety buffer applied once to every quantity before rounding up. */
export const QUANTITY_BUFFER = 1.1;
/** One dessert portion per adult-equivalent. */
export const DESSERT_PORTIONS_PER_ADULT = 1;

/** Each dietary group with ≥ 1 member needs at least this many suitable mains. */
export const MIN_MAINS_PER_DIET_GROUP = 2;

/** Default seats per table — editable. */
export const SEATS_PER_TABLE = 8;
/** Default probability that a "maybe" RSVP attends — editable. */
export const DEFAULT_MAYBE_PROBABILITY = 0.5;

/**
 * Which dietary groups a dish tagged X also satisfies.
 * Vegan food is vegetarian and dairy-free; Jain food is vegetarian (no root vegetables either).
 */
export const DIET_SATISFIES: Partial<Record<Dietary, Dietary[]>> = {
  vegan: ['vegetarian', 'dairy_free'],
  jain: ['vegetarian'],
};

/** Budget categories → the priority weight that drives their share of the budget. */
export const CATEGORY_WEIGHT: Record<Exclude<BudgetCategory, 'misc'>, PriorityKey> = {
  venue: 'comfort',
  food: 'food',
  decor: 'decor',
  entertainment: 'entertainment',
  photos: 'photos',
  rentals: 'comfort',
};

/** Typical relative size of each category for a family celebration — planning heuristic. */
export const CATEGORY_BASE_SHARE: Record<Exclude<BudgetCategory, 'misc'>, number> = {
  venue: 25,
  food: 35,
  decor: 10,
  entertainment: 8,
  photos: 8,
  rentals: 7,
};

/** Contingency kept aside before weighted allocation: 5 %. */
export const CONTINGENCY_PERCENT = 5;

/** Recovery ranking weights (docs/DATA_MODEL.md "Recovery ranking"). */
export const SCORE_HARD_FIX = 100;
export const SCORE_SOFT_FIX = 20;

/** Countdown is announced to screen readers only when this close to the next segment. */
export const LIVE_ANNOUNCE_THRESHOLD_MIN = 5;
