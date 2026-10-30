/** ISO-4217 currencies with no minor unit; everything else uses 2 decimals. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX']);

/**
 * Minor-unit exponent for a currency.
 * @example minorUnitExponent('INR') // 2
 */
export function minorUnitExponent(currency: string): number {
  return ZERO_DECIMAL.has(currency) ? 0 : 2;
}

/**
 * Format integer minor units for display.
 * @example formatMoney({ amount: 150000, currency: 'INR' }) // "₹1,500"
 */
export function formatMoney(money: { amount: number; currency: string }, locale?: string): string {
  const exp = minorUnitExponent(money.currency);
  const major = money.amount / 10 ** exp;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      maximumFractionDigits: Number.isInteger(major) ? 0 : exp,
      minimumFractionDigits: Number.isInteger(major) ? 0 : exp,
    }).format(major);
  } catch {
    return `${money.currency} ${major.toFixed(exp)}`;
  }
}

/**
 * Parse a user-typed major amount ("1,500.50") into integer minor units; undefined if invalid.
 * @example parseMajorToMinor('1,500.5', 'INR') // 150050
 */
export function parseMajorToMinor(input: string, currency: string): number | undefined {
  const cleaned = input.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const exp = minorUnitExponent(currency);
  return Math.round(Number(cleaned) * 10 ** exp);
}

/**
 * Minor units → plain major-unit string for form inputs.
 * @example minorToMajorInput(150050, 'INR') // "1500.5"
 */
export function minorToMajorInput(amount: number, currency: string): string {
  return String(amount / 10 ** minorUnitExponent(currency));
}
