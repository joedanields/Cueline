import { addHours, format } from 'date-fns';
import {
  EventSchema,
  type CelebrationEvent,
  type MealType,
  type PriorityWeights,
  type VenueType,
} from '../../shared/schemas';
import type { AiInput, IntakeField } from '../../shared/aiTasks';
import { minorToMajorInput, parseMajorToMinor } from '../../lib/money';

/** Form-friendly intake state; converted to an Event on confirm. Datetimes are `datetime-local` values. */
export type IntakeDraft = {
  occasion: string;
  title: string;
  startsAt: string;
  endsAt: string;
  venueType?: VenueType;
  region: string;
  culturalContext: string;
  budgetMajor: string;
  currency: string;
  guestCountRough: string;
  mealTypes: MealType[];
  kidsAgeRange: string;
  weatherBackup: string;
  weights: PriorityWeights;
};

export const MAX_QUESTIONS = 8;
export const REQUIRED_FIELDS: IntakeField[] = [
  'occasion',
  'startsAt',
  'venueType',
  'budget',
  'mealTypes',
  'weights',
];
export const DEFAULT_WEIGHTS: PriorityWeights = {
  food: 3,
  comfort: 3,
  decor: 3,
  entertainment: 3,
  photos: 3,
};
const DEFAULT_DURATION_HOURS = 4;
const LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";
const REGION_CURRENCY: Record<string, string> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  AU: 'AUD',
  CA: 'CAD',
  SG: 'SGD',
  AE: 'AED',
  JP: 'JPY',
};
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY'];

/**
 * Currency guess from a BCP 47 locale ("en-IN" → INR); EUR for euro-area languages, else USD.
 * @example currencyForLocale('en-IN') // 'INR'
 */
export function currencyForLocale(locale: string): string {
  const region = locale.split('-')[1]?.toUpperCase() ?? '';
  if (REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  return ['de', 'fr', 'es', 'it', 'nl', 'pt'].includes(locale.split('-')[0] ?? '') ? 'EUR' : 'USD';
}

/** Empty draft for a new plan. */
export function emptyDraft(locale: string): IntakeDraft {
  return {
    occasion: '',
    title: '',
    startsAt: '',
    endsAt: '',
    region: '',
    culturalContext: '',
    budgetMajor: '',
    currency: currencyForLocale(locale),
    guestCountRough: '',
    mealTypes: [],
    kidsAgeRange: '',
    weatherBackup: '',
    weights: { ...DEFAULT_WEIGHTS },
  };
}

const toLocal = (iso: string) => format(new Date(iso), LOCAL_FORMAT);

/**
 * Draft from an existing event so every answer can be edited without restarting (PRD F9).
 * @example draftFromEvent(event, 'en-IN').occasion // 'Birthday'
 */
export function draftFromEvent(e: CelebrationEvent, locale: string): IntakeDraft {
  return {
    ...emptyDraft(locale),
    occasion: e.occasion,
    title: e.title,
    startsAt: toLocal(e.startsAt),
    endsAt: toLocal(e.endsAt),
    venueType: e.venueType,
    region: e.region ?? '',
    culturalContext: e.culturalContext ?? '',
    budgetMajor: minorToMajorInput(e.budget.amount, e.budget.currency),
    currency: e.budget.currency,
    mealTypes: [...e.mealTypes],
    weights: { ...e.weights },
  };
}

const weightsText = (w: PriorityWeights) =>
  Object.entries(w)
    .map(([k, v]) => `${k} ${v}/5`)
    .join(', ');

/**
 * Answers in the shape the `intakeNext` task accepts (only fields that have a value).
 * @example toAiAnswers({ ...draft, occasion: 'Birthday' }).occasion // 'Birthday'
 */
export function toAiAnswers(
  d: IntakeDraft,
  asked: IntakeField[],
): AiInput<'intakeNext'>['answers'] {
  const all: AiInput<'intakeNext'>['answers'] = {
    occasion: d.occasion,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
    venueType: d.venueType ?? '',
    region: d.region,
    culturalContext: d.culturalContext,
    budget: d.budgetMajor ? `${d.budgetMajor} ${d.currency}` : '',
    guestCountRough: d.guestCountRough ? Number(d.guestCountRough) : '',
    mealTypes: d.mealTypes,
    kidsAgeRange: d.kidsAgeRange,
    weatherBackup: d.weatherBackup,
    weights: asked.includes('weights') ? weightsText(d.weights) : '',
  };
  return Object.fromEntries(
    Object.entries(all)
      .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v !== ''))
      .map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 200) : v]),
  );
}

export type DraftErrors = Partial<Record<keyof IntakeDraft, string>>;

type Parsed = { start?: Date; end?: Date; amount?: number };

function parseDraft(d: IntakeDraft): Parsed {
  const start = d.startsAt ? new Date(d.startsAt) : undefined;
  const end = d.endsAt ? new Date(d.endsAt) : start && addHours(start, DEFAULT_DURATION_HOURS);
  return { start, end, amount: parseMajorToMinor(d.budgetMajor, d.currency) };
}

/** Field-level messages for everything required that is missing or inconsistent. */
function draftErrors(d: IntakeDraft, { start, end, amount }: Parsed): DraftErrors {
  const checks: [keyof IntakeDraft, boolean, string][] = [
    ['occasion', !d.occasion.trim(), 'Tell us what you are celebrating.'],
    ['startsAt', !start || Number.isNaN(start.getTime()), 'Choose when the celebration starts.'],
    ['endsAt', !!start && !!end && end <= start, 'The end must be after the start.'],
    ['venueType', !d.venueType, 'Choose a venue type.'],
    ['budgetMajor', amount === undefined, 'Enter a budget as a number (0 is fine).'],
    ['mealTypes', d.mealTypes.length === 0, 'Choose at least one thing you will serve.'],
  ];
  return Object.fromEntries(checks.filter(([, bad]) => bad).map(([k, , msg]) => [k, msg]));
}

/**
 * Validate the draft and build the Event. Missing end time defaults to start + 4 h.
 * @example draftToEvent(draft) // { ok: true, event } | { ok: false, errors }
 */
export function draftToEvent(
  d: IntakeDraft,
): { ok: true; event: CelebrationEvent } | { ok: false; errors: DraftErrors } {
  const values = parseDraft(d);
  const errors = draftErrors(d, values);
  const { start, end, amount } = values;
  if (Object.keys(errors).length > 0 || !start || !end) return { ok: false, errors };

  const parsed = EventSchema.safeParse({
    occasion: d.occasion.trim(),
    title: (d.title.trim() || d.occasion.trim()).slice(0, 80),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    venueType: d.venueType,
    region: d.region.trim() || undefined,
    culturalContext: d.culturalContext.trim() || undefined,
    budget: { amount, currency: d.currency },
    weights: d.weights,
    mealTypes: d.mealTypes,
    notes: noteFor(d),
  });
  return parsed.success
    ? { ok: true, event: parsed.data }
    : { ok: false, errors: { occasion: 'Some answers are too long. Please shorten them.' } };
}

function noteFor(d: IntakeDraft): string | undefined {
  const parts = [
    d.weatherBackup && `Weather backup: ${d.weatherBackup}`,
    d.kidsAgeRange && `Kids' ages: ${d.kidsAgeRange}`,
    d.guestCountRough && `Rough guest count: ${d.guestCountRough}`,
  ];
  const note = parts.filter(Boolean).join('. ');
  return note ? note.slice(0, 500) : undefined;
}

/** Which required fields still have no value (asked or not). */
export function missingRequired(d: IntakeDraft, asked: IntakeField[]): IntakeField[] {
  const has: Record<string, boolean> = {
    occasion: !!d.occasion.trim(),
    startsAt: !!d.startsAt,
    venueType: !!d.venueType,
    budget: !!d.budgetMajor,
    mealTypes: d.mealTypes.length > 0,
    weights: asked.includes('weights'),
  };
  return REQUIRED_FIELDS.filter((f) => !has[f] && !asked.includes(f));
}
