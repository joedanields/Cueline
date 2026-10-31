import type { Guest } from '../shared/schemas';

export type ZoneId = 'honoree' | 'step_free' | 'quiet' | 'kids' | 'general';

export type SeatingZone = {
  id: ZoneId;
  label: string;
  seats: number;
  guestIds: string[];
  /** Guest ids per table; no table exceeds seatsPerTable. */
  tables: string[][];
  reasons: string[];
};

type ZoneDef = { id: ZoneId; label: string; reasons: string[]; accepts: (g: Guest) => boolean };

const needsStepFree = (g: Guest) => g.mobility !== 'none';
const ZONES: ZoneDef[] = [
  {
    id: 'step_free',
    label: 'Step-free zone',
    accepts: needsStepFree,
    reasons: [
      'Level route from the entrance',
      'Space for wheelchairs and strollers',
      'Near accessible restroom',
    ],
  },
  {
    id: 'quiet',
    label: 'Quiet zone near restrooms',
    accepts: (g) => g.ageBand === 'senior' || g.sensory !== 'none',
    reasons: [
      'Away from speakers and the play area',
      'Short walk to restrooms',
      'Good lighting for low vision',
    ],
  },
  {
    id: 'kids',
    label: 'Family zone by the play area',
    accepts: (g) => g.ageBand === 'child' || g.ageBand === 'infant',
    reasons: ['Within sight of the kids’ corner', 'Room for high chairs'],
  },
  { id: 'general', label: 'General seating', accepts: () => true, reasons: ['Open seating'] },
];

/**
 * Split guests into tables of at most `seatsPerTable`; overflow opens a new table.
 * @example chunkTables(['a','b','c'], 2) // [['a','b'], ['c']]
 */
export function chunkTables(ids: string[], seatsPerTable: number): string[][] {
  const size = Math.max(1, Math.floor(seatsPerTable));
  const tables: string[][] = [];
  for (let i = 0; i < ids.length; i += size) tables.push(ids.slice(i, i + size));
  return tables;
}

/**
 * Need-aware seating zones. The honoree table always exists (honoree first, then VIPs up to one
 * table); mobility needs take precedence over age so wheelchair users always sit step-free.
 * Households stay together within a zone because guests keep list order.
 * @example computeSeating(guests, 8).find((z) => z.id === 'honoree')
 */
export function computeSeating(guests: Guest[], seatsPerTable: number): SeatingZone[] {
  const honoreeIds = [
    ...guests.filter((g) => g.role === 'honoree'),
    ...guests.filter((g) => g.role === 'vip'),
  ]
    .slice(0, Math.max(1, seatsPerTable))
    .map((g) => g.id);
  const placed = new Set(honoreeIds);
  const honoreeStepFree = guests.some((g) => placed.has(g.id) && needsStepFree(g));

  const zones: SeatingZone[] = [
    {
      id: 'honoree',
      label: 'Honoree table',
      seats: honoreeIds.length,
      guestIds: honoreeIds,
      tables: honoreeIds.length ? [honoreeIds] : [[]],
      reasons: [
        'Centre of the room, clear sightline for speeches',
        ...(honoreeStepFree ? ['Step-free access needed at this table'] : []),
      ],
    },
  ];

  for (const def of ZONES) {
    const ids = guests.filter((g) => !placed.has(g.id) && def.accepts(g)).map((g) => g.id);
    ids.forEach((id) => placed.add(id));
    if (ids.length === 0) continue;
    zones.push({
      id: def.id,
      label: def.label,
      seats: ids.length,
      guestIds: ids,
      tables: chunkTables(ids, seatsPerTable),
      reasons: def.reasons,
    });
  }
  return zones;
}

/**
 * Total tables needed across zones.
 * @example totalTables(computeSeating(guests, 8))
 */
export function totalTables(zones: SeatingZone[]): number {
  return zones.reduce((n, z) => n + z.tables.length, 0);
}
