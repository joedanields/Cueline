import type { AgeBand, CelebrationEvent } from '../shared/schemas';
import {
  DESSERT_PORTIONS_PER_ADULT,
  DRINK_LITRES_PER_ADULT_PER_HOUR,
  MAINS_GRAMS_PER_ADULT,
  OUTDOOR_DRINK_UPLIFT,
  PORTION_MULTIPLIER,
  QUANTITY_BUFFER,
  SNACK_HOURS_CAP,
  SNACKS_PER_ADULT_PER_HOUR,
} from './constants';

export type QuantityUnit = 'kg' | 'L' | 'pcs' | 'portions';
export type QuantityLine = {
  item: string;
  unit: QuantityUnit;
  amount: number;
  /** Human-readable formula so the user can see (and challenge) the assumption. */
  basis: string;
  manual: boolean;
};

export type QuantityInput = {
  byBand: Record<AgeBand, number>;
  event: Pick<CelebrationEvent, 'mealTypes' | 'venueType' | 'startsAt' | 'endsAt'>;
  overrides?: Record<string, number>;
};

const MINUTES_PER_HOUR = 60;
const GRAMS_PER_KG = 1000;
const BUFFER_PERCENT = Math.round((QUANTITY_BUFFER - 1) * 100);

/** Round up to one decimal place (kg / L). Tiny epsilon guards float noise like 2.0000000001. */
const ceilTenth = (n: number) => Math.max(0, Math.ceil(n * 10 - 1e-9) / 10);
const ceilWhole = (n: number) => Math.max(0, Math.ceil(n - 1e-9));
const fmt = (n: number) => Number(n.toFixed(1)).toString();

/**
 * Adult-equivalent eaters: Σ expected guests per band × portion multiplier.
 * @example adultEquivalents({ infant: 2, child: 4, teen: 0, adult: 10, senior: 5 }) // 16
 */
export function adultEquivalents(byBand: Record<AgeBand, number>): number {
  let total = 0;
  for (const band of Object.keys(byBand) as AgeBand[])
    total += byBand[band] * PORTION_MULTIPLIER[band];
  return total;
}

/**
 * Event length in hours (never negative).
 * @example eventHours({ startsAt: '2030-01-01T12:00:00Z', endsAt: '2030-01-01T16:30:00Z' }) // 4.5
 */
export function eventHours(event: Pick<CelebrationEvent, 'startsAt' | 'endsAt'>): number {
  const ms = Date.parse(event.endsAt) - Date.parse(event.startsAt);
  return Number.isFinite(ms) && ms > 0 ? ms / (MINUTES_PER_HOUR * 60_000) : 0;
}

type LineCtx = { eaters: number; hours: number; who: string; event: QuantityInput['event'] };
type LineBuilder = (ctx: LineCtx) => QuantityLine | undefined;

const line = (item: string, unit: QuantityLine['unit'], amount: number, basis: string) => ({
  item,
  unit,
  amount,
  basis,
  manual: false,
});

const mains: LineBuilder = ({ eaters, who, event }) => {
  const meals = event.mealTypes.filter((m) => m === 'lunch' || m === 'dinner').length;
  if (meals === 0) return undefined;
  const kg = (eaters * MAINS_GRAMS_PER_ADULT * meals * QUANTITY_BUFFER) / GRAMS_PER_KG;
  const basis = `${who} × ${MAINS_GRAMS_PER_ADULT} g × ${meals} meal(s) + ${BUFFER_PERCENT}%`;
  return line('Mains', 'kg', ceilTenth(kg), basis);
};

const snacks: LineBuilder = ({ eaters, hours, who, event }) => {
  if (!event.mealTypes.includes('snacks')) return undefined;
  const h = Math.min(hours, SNACK_HOURS_CAP);
  const pcs = eaters * SNACKS_PER_ADULT_PER_HOUR * h * QUANTITY_BUFFER;
  const rate = `${SNACKS_PER_ADULT_PER_HOUR}/h × ${fmt(h)} h (max ${SNACK_HOURS_CAP})`;
  return line('Snacks', 'pcs', ceilWhole(pcs), `${who} × ${rate} + ${BUFFER_PERCENT}%`);
};

const dessert: LineBuilder = ({ eaters, who, event }) => {
  if (!event.mealTypes.includes('dessert')) return undefined;
  const portions = eaters * DESSERT_PORTIONS_PER_ADULT * QUANTITY_BUFFER;
  const basis = `${who} × ${DESSERT_PORTIONS_PER_ADULT} + ${BUFFER_PERCENT}%`;
  return line('Dessert', 'portions', ceilWhole(portions), basis);
};

const drinks: LineBuilder = ({ eaters, hours, who, event }) => {
  if (!event.mealTypes.includes('drinks')) return undefined;
  const outdoor = event.venueType === 'outdoor';
  const uplift = outdoor ? OUTDOOR_DRINK_UPLIFT : 1;
  const litres = eaters * DRINK_LITRES_PER_ADULT_PER_HOUR * hours * uplift * QUANTITY_BUFFER;
  const rate = `${DRINK_LITRES_PER_ADULT_PER_HOUR} L/h × ${fmt(hours)} h`;
  const heat = outdoor ? ` × ${OUTDOOR_DRINK_UPLIFT} outdoor` : '';
  return line('Drinks', 'L', ceilTenth(litres), `${who} × ${rate}${heat} + ${BUFFER_PERCENT}%`);
};

const BUILDERS: LineBuilder[] = [mains, snacks, dessert, drinks];

/**
 * Food and drink quantities by age band × meal type × duration. Buffer applied once, rounded up.
 * A user override replaces the computed amount and is labelled manual.
 * @example computeQuantities({ byBand, event }).find((q) => q.item === 'Mains')?.unit // 'kg'
 */
export function computeQuantities({
  byBand,
  event,
  overrides = {},
}: QuantityInput): QuantityLine[] {
  const eaters = adultEquivalents(byBand);
  const ctx: LineCtx = {
    eaters,
    hours: eventHours(event),
    who: `${fmt(eaters)} adult-equivalents`,
    event,
  };
  return BUILDERS.map((build) => build(ctx))
    .filter((l): l is QuantityLine => l !== undefined)
    .map((l) => applyOverride(l, overrides[l.item]));
}

function applyOverride(line: QuantityLine, override: number | undefined): QuantityLine {
  if (override === undefined) return line;
  return {
    ...line,
    amount: override,
    manual: true,
    basis: `Set by you (calculated: ${line.amount} ${line.unit})`,
  };
}
