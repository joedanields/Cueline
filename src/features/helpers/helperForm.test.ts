import { describe, expect, it } from 'vitest';
import { EMPTY_HELPER_FORM, helperFromForm } from './helperLogic';

describe('helperFromForm', () => {
  it('requires a name', () => {
    expect(helperFromForm({ ...EMPTY_HELPER_FORM, name: '  ' })).toEqual({
      ok: false,
      error: 'Enter a name.',
    });
  });

  it('rejects availability that ends before it starts', () => {
    const r = helperFromForm({
      name: 'Anil',
      phone: '',
      from: '2030-01-01T12:00',
      to: '2030-01-01T10:00',
    });
    expect(r.ok).toBe(false);
  });

  it('trims fields, drops an empty phone and converts times to ISO', () => {
    const r = helperFromForm({ name: ' Anne ', phone: ' ', from: '2030-01-01T09:00', to: '' });
    expect(r.ok && r.helper).toMatchObject({
      name: 'Anne',
      phone: undefined,
      availableTo: undefined,
    });
    expect(r.ok && r.helper.availableFrom).toMatch(/^2030-01-01T/);
  });
});
