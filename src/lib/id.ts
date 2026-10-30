const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 8;

export type IdPrefix = 'g' | 'h' | 't' | 's' | 'v' | 'b' | 'c' | 'k' | 'ver' | 'hh';

/**
 * Prefixed random id (`g_k3x9q0ab`) — the nanoid(8) convention from DATA_MODEL without the dependency.
 * @example newId('g') // "g_4f9a0c2e"
 */
export function newId(prefix: IdPrefix): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return `${prefix}_${out}`;
}
