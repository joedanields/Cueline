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
  for (const band of Object.keys(byBand) as AgeBand[]) total += byBand[band] * PORTION_MULTIPLIER[band];
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

/**
 * Food and drink quantities by age band × meal type × duration. Buffer applied once, rounded up.
 * A user override replaces the computed amount and is labelled manual.
 * @example computeQuantities({ byBand, event }).find((q) => q.item === 'Mains')?.unit // 'kg'
 */
export function computeQuantities({ byBand, event, overrides = {} }: QuantityInput): QuantityLine[] {
  const eaters = adultEquivalents(byBand);
  const hours = eventHours(event);
  const meals = event.mealTypes.filter((m) => m === 'lunch' || m === 'dinner').length;
  const who = `${fmt(eaters)} adult-equivalents`;
  const lines: QuantityLine[] = [];

  if (meals > 0) {
    const kg = (eaters * MAINS_GRAMS_PER_ADULT * meals * QUANTITY_BUFFER) / GRAMS_PER_KG;
    lines.push({ item: 'Mains', unit: 'kg', amount: ceilTenth(kg), manual: false,
      basis: `${who} × ${MAINS_GRAMS_PER_ADULT} g × ${meals} meal(s) + ${BUFFER_PERCENT}%` });
  }
  if (event.mealTypes.includes('snacks')) {
    const snackHours = Math.min(hours, SNACK_HOURS_CAP);
    lines.push({ item: 'Snacks', unit: 'pcs', manual: false,
      amount: ceilWhole(eaters * SNACKS_PER_ADULT_PER_HOUR * snackHours * QUANTITY_BUFFER),
      basis: `${who} × ${SNACKS_PER_ADULT_PER_HOUR}/h × ${fmt(snackHours)} h (max ${SNACK_HOURS_CAP}) + ${BUFFER_PERCENT}%` });
  }
  if (event.mealTypes.includes('dessert')) {
    lines.push({ item: 'Dessert', unit: 'portions', manual: false,
      amount: ceilWhole(eaters * DESSERT_PORTIONS_PER_ADULT * QUANTITY_BUFFER),
      basis: `${who} × ${DESSERT_PORTIONS_PER_ADULT} + ${BUFFER_PERCENT}%` });
  }
  if (event.mealTypes.includes('drinks')) {
    const outdoor = event.venueType === 'outdoor';
    const uplift = outdoor ? OUTDOOR_DRINK_UPLIFT : 1;
    lines.push({ item: 'Drinks', unit: 'L', manual: false,
      amount: ceilTenth(eaters * DRINK_LITRES_PER_ADULT_PER_HOUR * hours * uplift * QUANTITY_BUFFER),
      basis: `${who} × ${DRINK_LITRES_PER_ADULT_PER_HOUR} L/h × ${fmt(hours)} h${outdoor ? ' × 1.3 outdoor' : ''} + ${BUFFER_PERCENT}%` });
  }
  return lines.map((line) => applyOverride(line, overrides[line.item]));
}

function applyOverride(line: QuantityLine, override: number | undefined): QuantityLine {
  if (override === undefined) return line;
  return { ...line, amount: override, manual: true, basis: `Set by you (calculated: ${line.amount} ${line.unit})` };
}
