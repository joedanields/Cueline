import type { Guest } from '../../shared/schemas';
import { toCsv } from '../../lib/csv';

const HEADER = [
  'Name',
  'Age band',
  'Diet',
  'Mobility',
  'Sensory',
  'Travel',
  'Role',
  'RSVP',
  'Note',
];

/**
 * Guest list as CSV: one row per guest, diets joined with "; " so the cell stays one column.
 * @example guestCsv([guest]).split('\r\n')[0] // 'Name,Age band,Diet,…'
 */
export function guestCsv(guests: Guest[]): string {
  const rows = guests.map((g) => [
    g.name,
    g.ageBand,
    g.dietary.join('; '),
    g.mobility,
    g.sensory,
    g.travel,
    g.role,
    g.rsvp,
    g.note,
  ]);
  return toCsv([HEADER, ...rows]);
}
