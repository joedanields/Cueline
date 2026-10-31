/**
 * Guest privacy (CLAUDE.md rule 3): names never leave the browser. Each guest line is split into a
 * name part (kept locally) and details (sent), every known name token anywhere in the text is
 * replaced by that guest's stable id, and emails / long digit runs are masked.
 */

export type GuestLine = { name: string; details: string };
export type PseudonymizedLine = { id: string; text: string };
export type Pseudonymized = { lines: PseudonymizedLine[]; idToName: Map<string, string> };

// Relationship words carry age/role signal ("Nani", "grandpa") without identifying anyone.
const KINSHIP = new Set([
  'grandpa',
  'grandma',
  'grandfather',
  'grandmother',
  'nani',
  'nana',
  'dadi',
  'dada',
  'ammamma',
  'thatha',
  'paati',
  'aunt',
  'aunty',
  'auntie',
  'uncle',
  'cousin',
  'baby',
  'mom',
  'mum',
  'dad',
  'family',
  'kids',
  'kid',
  'son',
  'daughter',
  'wife',
  'husband',
  'partner',
  'friend',
  'neighbour',
  'neighbor',
  'colleague',
  'mr',
  'mrs',
  'ms',
  'dr',
  'and',
  '&',
  'the',
]);
const SEPARATOR = /\s+[—–-]\s+|[—–:;|(\t,]/;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// 7+ digits, optionally separated by spaces, dots or dashes (phone numbers, ids).
const LONG_DIGITS = /\+?\d(?:[\s.-]?\d){6,}/g;

/**
 * Split "Raman family (4) — 2 kids, veg" into name "Raman family" and the rest.
 * @example splitGuestLine('Nani: knee trouble') // { name: 'Nani', details: 'knee trouble' }
 */
export function splitGuestLine(raw: string): GuestLine {
  const line = raw.trim();
  const match = SEPARATOR.exec(line);
  if (!match) return { name: line, details: '' };
  const keep = match[0].trim() === '(' ? '(' : '';
  return {
    name: line.slice(0, match.index).trim(),
    details: `${keep}${line.slice(match.index + match[0].length)}`.trim(),
  };
}

/**
 * Mask emails and digit runs of 7 or more (phone numbers) before anything is sent.
 * @example maskPii('call 98765 43210 or a@b.co') // 'call [number] or [email]'
 */
export function maskPii(text: string): string {
  return text.replace(EMAIL, '[email]').replace(LONG_DIGITS, '[number]');
}

const tokensOf = (name: string) =>
  name
    .split(/[\s.'’]+/)
    .map((t) => t.trim())
    .filter(Boolean);
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Stable pseudonymous id for the n-th line (1-based).
 * @example guestCode(1) // 'g_001'
 */
export function guestCode(n: number): string {
  return `g_${String(n).padStart(3, '0')}`;
}

/**
 * Replace names with ids consistently across all lines. Kinship words in the name part are kept
 * as context; every other name token is registered and replaced wherever it appears.
 * @example pseudonymize([{ name: 'Asha', details: 'veg, sister of Ravi' }, { name: 'Ravi', details: '' }])
 * // lines[0].text === 'veg, sister of g_002'
 */
export function pseudonymize(guests: GuestLine[]): Pseudonymized {
  const idToName = new Map<string, string>();
  const registry: { token: string; id: string }[] = [];
  const contexts = guests.map((g, i) => {
    const id = guestCode(i + 1);
    idToName.set(id, g.name);
    const kin: string[] = [];
    for (const token of tokensOf(g.name)) {
      if (KINSHIP.has(token.toLowerCase()) || /^\(?\d+\)?$/.test(token)) kin.push(token);
      else if (token.length >= 2) registry.push({ token, id });
    }
    return { id, prefix: kin.join(' ') };
  });
  // Longest tokens first so "Ramanathan" is replaced before "Raman".
  registry.sort((a, b) => b.token.length - a.token.length);
  const lines = guests.map((g, i) => {
    let text = maskPii([contexts[i]?.prefix, g.details].filter(Boolean).join(': '));
    for (const { token, id } of registry)
      text = text.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi'), id);
    return { id: contexts[i]?.id ?? guestCode(i + 1), text: text.slice(0, 200) };
  });
  return { lines, idToName };
}

/**
 * Put real names back into AI text (client-side only).
 * @example restoreNames('g_001 needs a ramp', new Map([['g_001', 'Asha']])) // 'Asha needs a ramp'
 */
export function restoreNames(text: string, idToName: Map<string, string>): string {
  return text.replace(/\bg_\d{3}[a-z]?\b/g, (id) => idToName.get(id.slice(0, 5)) ?? id);
}
