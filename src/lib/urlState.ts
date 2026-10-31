import { z } from 'zod';
import { VenueType } from '../shared/schemas/event';

/** Max encoded length accepted from a URL fragment — far above a real card, far below abuse. */
export const MAX_FRAGMENT_CHARS = 12_000;

/** Only what one helper needs: their name, the event basics, their tasks and cues. No guest data. */
export const HelperCardSchema = z.object({
  v: z.literal(1),
  name: z.string().min(1).max(60),
  event: z.object({
    title: z.string().max(80),
    startsAt: z.string().max(40),
    venueType: VenueType,
  }),
  brief: z.string().max(600).optional(),
  tasks: z.array(z.object({ title: z.string().max(100), due: z.string().max(20) })).max(30),
  segments: z
    .array(
      z.object({ time: z.string().max(10), title: z.string().max(80), cue: z.string().max(200) }),
    )
    .max(30),
});
export type HelperCardData = z.infer<typeof HelperCardSchema>;

const toBase64Url = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) =>
    c.charCodeAt(0),
  );
};

/**
 * Encode a helper card for a URL fragment (`/card#…`). Fragments never reach a server log.
 * @example decodeHelperCard(encodeHelperCard(card)) // card
 */
export function encodeHelperCard(card: HelperCardData): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(card)));
}

/**
 * Decode and validate a fragment. Anything malformed, oversized or off-schema returns undefined.
 * @example decodeHelperCard('#not-valid') // undefined
 */
export function decodeHelperCard(fragment: string): HelperCardData | undefined {
  const raw = fragment.replace(/^#/, '');
  if (!raw || raw.length > MAX_FRAGMENT_CHARS) return undefined;
  try {
    const parsed = HelperCardSchema.safeParse(
      JSON.parse(new TextDecoder().decode(fromBase64Url(raw))),
    );
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
