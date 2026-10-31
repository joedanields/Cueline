import { describe, expect, it } from 'vitest';
import { makeGuest } from '../../../tests/fixtures/state';
import { guestCsv } from './guestCsv';

describe('guestCsv', () => {
  it('writes a header and one row per guest, joining diets in one cell', () => {
    const csv = guestCsv([makeGuest({ name: 'Asha', dietary: ['vegetarian', 'nut_allergy'] })]);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe('Name,Age band,Diet,Mobility,Sensory,Travel,Role,RSVP,Note');
    expect(row).toContain('Asha');
    expect(row).toContain('vegetarian; nut_allergy');
  });

  it('writes only the header for an empty list', () => {
    expect(guestCsv([]).split('\r\n').filter(Boolean)).toHaveLength(1);
  });
});
