import type { AiOutput } from '../../shared/aiTasks';
import type { AgeBand, Guest } from '../../shared/schemas';
import { newId } from '../../lib/id';
import { splitGuestLine, type GuestLine } from '../../lib/pseudonymize';

export const MAX_IMPORT_LINES = 250;
export const MAX_CSV_BYTES = 200 * 1024;
export const MAX_CSV_ROWS = 500;
const MAX_NAME = 80;

/**
 * One guest or household per non-empty line, capped at 250 lines.
 * @example parsePastedLines('Asha — veg\n\nRavi') // [{ name: 'Asha', details: 'veg' }, { name: 'Ravi', details: '' }]
 */
export function parsePastedLines(text: string): GuestLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_IMPORT_LINES)
    .map(splitGuestLine);
}

type CsvState = { rows: string[][]; row: string[]; field: string; quoted: boolean };

function endField(p: CsvState) {
  p.row.push(p.field);
  p.field = '';
}

function endRow(p: CsvState) {
  endField(p);
  p.rows.push(p.row);
  p.row = [];
}

/** Inside quotes: `""` is a literal quote, a lone `"` closes the field. Returns the new index. */
function stepQuoted(p: CsvState, text: string, i: number): number {
  const ch = text[i];
  if (ch === '"' && text[i + 1] === '"') {
    p.field += '"';
    return i + 1;
  }
  if (ch === '"') p.quoted = false;
  else p.field += ch;
  return i;
}

/** Consume one character; returns the index of the last character consumed (CRLF = 2). */
function step(p: CsvState, text: string, i: number): number {
  if (p.quoted) return stepQuoted(p, text, i);
  const ch = text[i];
  if (ch === '"') p.quoted = true;
  else if (ch === ',') endField(p);
  else if (ch === '\n' || ch === '\r') {
    endRow(p);
    return ch === '\r' && text[i + 1] === '\n' ? i + 1 : i;
  } else p.field += ch;
  return i;
}

/**
 * Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). Size and row caps apply.
 * @example parseCsvRows('a,"b,c"\n1,2') // [['a','b,c'],['1','2']]
 */
export function parseCsvRows(text: string): string[][] {
  const p: CsvState = { rows: [], row: [], field: '', quoted: false };
  for (let i = 0; i < text.length && p.rows.length < MAX_CSV_ROWS + 1; i++) i = step(p, text, i);
  if (p.field || p.row.length) endRow(p);
  return p.rows.filter((r) => r.some((c) => c.trim()));
}

const NAME_HEADERS = ['name', 'guest', 'guest name', 'full name'];
const NOTE_HEADERS = ['notes', 'note', 'details', 'description', 'needs', 'comments'];

/**
 * CSV → guest lines. Uses a header row if it has a name column; otherwise column 1 is the name and
 * the remaining columns are joined as details.
 * @example parseCsvGuests('Name,Notes\nAsha,veg') // [{ name: 'Asha', details: 'veg' }]
 */
export function parseCsvGuests(text: string): GuestLine[] | { error: string } {
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES)
    return { error: 'That file is larger than 200 KB. Split it into smaller files.' };
  const rows = parseCsvRows(text);
  const header = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
  const nameCol = header.findIndex((h) => NAME_HEADERS.includes(h));
  const noteCols = header.map((h, i) => (NOTE_HEADERS.includes(h) ? i : -1)).filter((i) => i >= 0);
  const body = nameCol >= 0 ? rows.slice(1) : rows;
  const lines = body.slice(0, MAX_IMPORT_LINES).map((r) => {
    const name = (r[nameCol >= 0 ? nameCol : 0] ?? '').trim();
    const rest = nameCol >= 0 ? noteCols.map((i) => r[i] ?? '') : r.slice(1);
    return {
      name,
      details: rest
        .map((c) => c.trim())
        .filter(Boolean)
        .join(', '),
    };
  });
  return lines.filter((l) => l.name);
}

const BAND_LABEL: Record<AgeBand, string> = {
  infant: 'infant',
  child: 'child',
  teen: 'teen',
  adult: 'adult',
  senior: 'senior',
};
type LensGuest = AiOutput<'guestLens'>['guests'][number];

function defaultGuest(name: string): Guest {
  const low = {
    ageBand: 'low',
    dietary: 'low',
    mobility: 'low',
    sensory: 'low',
    travel: 'low',
    role: 'low',
  } as const;
  return {
    id: newId('g'),
    name: name.slice(0, MAX_NAME) || 'Guest',
    ageBand: 'adult',
    dietary: [],
    mobility: 'none',
    sensory: 'none',
    travel: 'local',
    role: 'guest',
    rsvp: 'invited',
    confidence: { ...low },
    reviewed: false,
  };
}

function fromLens(t: LensGuest, name: string, householdId?: string): Guest {
  const confidence: Record<string, 'high' | 'medium' | 'low'> = {};
  for (const [field, level] of Object.entries(t.confidence)) if (level) confidence[field] = level;
  return {
    ...defaultGuest(name),
    householdId,
    ageBand: t.ageBand,
    dietary: [...new Set(t.dietary)],
    mobility: t.mobility,
    sensory: t.sensory,
    travel: t.travel,
    role: t.role,
    note: t.note?.slice(0, 200),
    confidence,
  };
}

/**
 * Re-attach real names to Guest Lens output (client-side). Households (`g_002a`, `g_002b`) become
 * one guest per member sharing a householdId; lines the AI skipped are kept with low-confidence defaults.
 * @example buildGuestsFromLens(output, idToName).length
 */
export function buildGuestsFromLens(
  output: AiOutput<'guestLens'>,
  idToName: Map<string, string>,
): Guest[] {
  const byLine = new Map<string, LensGuest[]>();
  for (const g of output.guests) {
    const lineId = g.id.slice(0, 5);
    if (idToName.has(lineId)) byLine.set(lineId, [...(byLine.get(lineId) ?? []), g]);
  }
  return [...idToName.entries()].flatMap(([lineId, name]) => {
    const tagged = byLine.get(lineId);
    if (!tagged?.length) return [defaultGuest(name)];
    if (tagged.length === 1 && tagged[0]?.id === lineId) return [fromLens(tagged[0], name)];
    const householdId = newId('hh');
    const counts = new Map<AgeBand, number>();
    return tagged.map((t) => {
      const n = (counts.get(t.ageBand) ?? 0) + 1;
      counts.set(t.ageBand, n);
      return fromLens(t, `${name} · ${BAND_LABEL[t.ageBand]} ${n}`.slice(0, MAX_NAME), householdId);
    });
  });
}

/**
 * Guests added without AI (offline / AI failed): defaults, every tag flagged "Check this".
 * @example guestsWithoutAi([{ name: 'Asha', details: '' }])[0]?.confidence.ageBand // 'low'
 */
export function guestsWithoutAi(lines: GuestLine[]): Guest[] {
  return lines.map((l) => ({
    ...defaultGuest(l.name),
    note: l.details.slice(0, 200) || undefined,
  }));
}

/** Fields flagged "Check this": low confidence and not yet reviewed. */
export function lowConfidenceFields(g: Guest): string[] {
  if (g.reviewed) return [];
  return Object.entries(g.confidence)
    .filter(([, c]) => c === 'low')
    .map(([f]) => f);
}
