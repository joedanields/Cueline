import { describe, expect, it } from 'vitest';
import { formatMoney, minorToMajorInput, minorUnitExponent, parseMajorToMinor } from './money';
import { newId } from './id';

describe('money', () => {
  it('formats integer minor units with the currency', () => {
    expect(formatMoney({ amount: 150000, currency: 'INR' }, 'en-IN')).toBe('₹1,500');
    expect(formatMoney({ amount: 150050, currency: 'USD' }, 'en-US')).toBe('$1,500.50');
    expect(formatMoney({ amount: 500, currency: 'JPY' }, 'en-US')).toBe('¥500');
    expect(formatMoney({ amount: 100, currency: 'ZZZ1' })).toBe('ZZZ1 1.00');
  });

  it('parses typed amounts into minor units and rejects junk', () => {
    expect(parseMajorToMinor('1,500.5', 'INR')).toBe(150050);
    expect(parseMajorToMinor('12', 'JPY')).toBe(12);
    expect(parseMajorToMinor('-5', 'INR')).toBeUndefined();
    expect(parseMajorToMinor('abc', 'INR')).toBeUndefined();
    expect(minorToMajorInput(150050, 'INR')).toBe('1500.5');
    expect(minorUnitExponent('KRW')).toBe(0);
  });

  it('creates prefixed random ids', () => {
    expect(newId('g')).toMatch(/^g_[0-9a-z]{8}$/);
    expect(newId('g')).not.toBe(newId('g'));
  });
});
