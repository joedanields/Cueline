import { describe, expect, it } from 'vitest';
import {
  currencyForLocale,
  draftFromEvent,
  draftToEvent,
  emptyDraft,
  missingRequired,
  toAiAnswers,
  type IntakeDraft,
} from './intakeLogic';
import { validEvent } from '../../../tests/fixtures/state';

const filled = (o: Partial<IntakeDraft> = {}): IntakeDraft => ({
  ...emptyDraft('en-IN'),
  occasion: 'Birthday',
  startsAt: '2030-06-01T12:00',
  venueType: 'hall',
  budgetMajor: '1,50,000',
  mealTypes: ['lunch'],
  ...o,
});

describe('intakeLogic', () => {
  it('guesses currency from locale', () => {
    expect(currencyForLocale('en-IN')).toBe('INR');
    expect(currencyForLocale('de-DE')).toBe('EUR');
    expect(currencyForLocale('fr')).toBe('EUR');
    expect(currencyForLocale('xx')).toBe('USD');
  });

  it('builds a valid event, defaulting end to start + 4 h and title to occasion', () => {
    const r = draftToEvent(
      filled({ weatherBackup: 'Tents', kidsAgeRange: '2-6', guestCountRough: '60' }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.title).toBe('Birthday');
    expect(r.event.budget).toEqual({ amount: 15_000_000, currency: 'INR' });
    expect(Date.parse(r.event.endsAt) - Date.parse(r.event.startsAt)).toBe(4 * 3600_000);
    expect(r.event.notes).toMatch(/Weather backup: Tents/);
  });

  it('reports every missing or invalid field', () => {
    const r = draftToEvent(emptyDraft('en-US'));
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errors).sort()).toEqual([
        'budgetMajor',
        'mealTypes',
        'occasion',
        'startsAt',
        'venueType',
      ]);
    const backwards = draftToEvent(filled({ endsAt: '2030-06-01T10:00' }));
    expect(!backwards.ok && backwards.errors.endsAt).toMatch(/after the start/);
    const tooLong = draftToEvent(filled({ region: 'x'.repeat(100) }));
    expect(tooLong.ok).toBe(false);
  });

  it('round-trips an existing event into an editable draft', () => {
    const d = draftFromEvent(validEvent, 'en-IN');
    expect(d.occasion).toBe('Birthday');
    expect(d.budgetMajor).toBe('100000');
    const back = draftToEvent(d);
    expect(back.ok && back.event.budget).toEqual(validEvent.budget);
  });

  it('sends only filled answers and lists missing required fields', () => {
    const answers = toAiAnswers(filled(), ['occasion']);
    expect(answers).toMatchObject({
      occasion: 'Birthday',
      venueType: 'hall',
      budget: '1,50,000 INR',
      mealTypes: ['lunch'],
    });
    expect(answers.weights).toBeUndefined();
    expect(toAiAnswers(filled({ guestCountRough: '60' }), ['weights']).weights).toMatch(
      /food 3\/5/,
    );
    expect(missingRequired(emptyDraft('en-US'), ['budget'])).toEqual([
      'occasion',
      'startsAt',
      'venueType',
      'mealTypes',
      'weights',
    ]);
  });
});
