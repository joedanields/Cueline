import { describe, expect, it } from 'vitest';
import { guestCode, maskPii, pseudonymize, restoreNames, splitGuestLine } from './pseudonymize';

describe('pseudonymize', () => {
  it('splits a guest line into name and details', () => {
    expect(splitGuestLine('Nani — knee trouble, sugar-free')).toEqual({
      name: 'Nani',
      details: 'knee trouble, sugar-free',
    });
    expect(splitGuestLine('Raman family (4) — 2 kids under 6, veg')).toEqual({
      name: 'Raman family',
      details: '(4) — 2 kids under 6, veg',
    });
    expect(splitGuestLine('  Asha  ')).toEqual({ name: 'Asha', details: '' });
    expect(splitGuestLine('Mary-Jane: vegan').name).toBe('Mary-Jane');
  });

  it('replaces names consistently, keeps kinship words, and is reversible', () => {
    const { lines, idToName } = pseudonymize([
      { name: 'Asha Rao', details: 'veg, sister of Ravi' },
      { name: 'Ravi', details: 'brings Asha’s kids' },
      { name: 'Raman family', details: '(4) 2 kids' },
      { name: 'Grandpa', details: 'diabetic' },
    ]);
    expect(lines.map((l) => l.id)).toEqual(['g_001', 'g_002', 'g_003', 'g_004']);
    expect(lines[0]?.text).toBe('veg, sister of g_002');
    expect(lines[1]?.text).toBe('brings g_001’s kids');
    expect(lines[2]?.text).toBe('family: (4) 2 kids');
    expect(lines[3]?.text).toBe('Grandpa: diabetic');
    expect(restoreNames('g_002 and g_003b', idToName)).toBe('Ravi and Raman family');
    expect(restoreNames('g_999', idToName)).toBe('g_999');
    const joined = lines.map((l) => l.text).join(' ');
    for (const name of ['Asha', 'Rao', 'Ravi', 'Raman']) expect(joined).not.toContain(name);
  });

  it('prefers the longest name token so partial names cannot leak', () => {
    const { lines } = pseudonymize([
      { name: 'Ramanathan', details: '' },
      { name: 'Raman', details: 'friend of Ramanathan' },
    ]);
    expect(lines[1]?.text).toBe('friend of g_001');
  });

  it('masks emails and digit runs of 7 or more', () => {
    expect(maskPii('call +91 98765 43210 or asha@example.com, flat 12')).toBe(
      'call [number] or [email], flat 12',
    );
    expect(maskPii('1234567')).toBe('[number]');
    expect(maskPii('123456')).toBe('123456');
    const { lines } = pseudonymize([{ name: 'Asha', details: 'phone 9876543210' }]);
    expect(lines[0]?.text).toBe('phone [number]');
  });

  it('caps sent text at 200 characters and pads codes', () => {
    expect(pseudonymize([{ name: 'X', details: 'a'.repeat(300) }]).lines[0]?.text).toHaveLength(
      200,
    );
    expect(guestCode(42)).toBe('g_042');
  });
});
