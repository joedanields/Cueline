/** Cells starting with these characters are executed as formulas by spreadsheet apps. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Escape one CSV cell: neutralise formula prefixes (CSV injection), quote when needed.
 * @example csvCell('=HYPERLINK("x")') // "\"'=HYPERLINK(\"\"x\"\")\""
 */
export function csvCell(value: string | number | undefined): string {
  let text = value === undefined ? '' : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Rows → CSV text (CRLF line endings).
 * @example toCsv([['name'], ['Asha']]) // 'name\r\nAsha\r\n'
 */
export function toCsv(rows: (string | number | undefined)[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
