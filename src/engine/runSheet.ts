import type { GuestConstraint, RunSheet, Segment } from '../shared/schemas';

export type Violation = {
  segmentId: string;
  kind: 'overlap' | 'constraint' | 'overrun' | 'min_duration';
  severity: 'hard' | 'soft';
  message: string;
  constraintId?: string;
};

export type Break = { constraintId: string; byMin: number };

const end = (s: Segment) => s.offsetMin + s.durationMin;
const active = (s: Segment) => s.status !== 'skipped';
const overlapMin = (a: Segment, b: Segment) =>
  Math.min(end(a), end(b)) - Math.max(a.offsetMin, b.offsetMin);

/** Break for constraints that compare a segment with a second one; inactive pairs never break. */
function pairBreak(c: GuestConstraint, seg: Segment, other: Segment | undefined): number {
  if (!other || !active(other)) return 0;
  return c.kind === 'must_not_overlap'
    ? overlapMin(seg, other)
    : seg.offsetMin - end(other) - (c.minutesFromStart ?? 0);
}

/**
 * Minutes by which a constraint is broken (0 = satisfied). Constraints on skipped segments no
 * longer apply. `max_wait` uses `minutesFromStart` as the longest allowed gap after `otherSegmentId`.
 * @example constraintBreak({ kind: 'must_start_before', segmentId: 'l', minutesFromStart: 80 }, byId)
 * // 10 if lunch starts at 90
 */
export function constraintBreak(c: GuestConstraint, byId: Map<string, Segment>): number {
  const seg = byId.get(c.segmentId);
  if (!seg || !active(seg)) return 0;
  const limit = c.minutesFromStart ?? 0;
  if (c.kind === 'must_start_before') return Math.max(0, seg.offsetMin - limit);
  if (c.kind === 'must_end_before') return Math.max(0, end(seg) - limit);
  const other = c.otherSegmentId ? byId.get(c.otherSegmentId) : undefined;
  return Math.max(0, pairBreak(c, seg, other));
}

/**
 * All currently broken constraints.
 * @example findBreaks(segments, constraints) // [{ constraintId: 'c_senior_lunch', byMin: 10 }]
 */
export function findBreaks(segments: Segment[], constraints: GuestConstraint[]): Break[] {
  const byId = new Map(segments.map((s) => [s.id, s]));
  return constraints
    .map((c) => ({ constraintId: c.id, byMin: constraintBreak(c, byId) }))
    .filter((b) => b.byMin > 0);
}

/** Problems with one segment on its own: below its minimum, or running past the event end. */
function segmentViolations(a: Segment, eventDurationMin: number): Violation[] {
  const out: Violation[] = [];
  if (a.minDurationMin > a.durationMin) {
    const message = `Shorter than its minimum of ${a.minDurationMin} min.`;
    out.push({ segmentId: a.id, kind: 'min_duration', severity: 'hard', message });
  }
  if (end(a) > eventDurationMin) {
    const message = `Ends ${end(a) - eventDurationMin} min after the event's planned end.`;
    out.push({ segmentId: a.id, kind: 'overrun', severity: 'soft', message });
  }
  return out;
}

/** The same owner can't run two segments at once; each clash is reported on the later pair item. */
function ownerOverlaps(segs: Segment[]): Violation[] {
  return segs.flatMap((a, i) =>
    segs
      .slice(i + 1)
      .filter((b) => a.ownerId && a.ownerId === b.ownerId && overlapMin(a, b) > 0)
      .map((b) => ({
        segmentId: b.id,
        kind: 'overlap' as const,
        severity: 'hard' as const,
        message: `Same person also runs “${a.title}” at this time.`,
      })),
  );
}

function constraintViolations(runSheet: RunSheet): Violation[] {
  const byId = new Map(runSheet.segments.map((s) => [s.id, s]));
  return runSheet.constraints.flatMap((c) => {
    const by = constraintBreak(c, byId);
    if (by <= 0) return [];
    const message = `${c.reason} — misses by ${by} min.`;
    return [
      {
        segmentId: c.segmentId,
        kind: 'constraint',
        severity: c.severity,
        constraintId: c.id,
        message,
      },
    ];
  });
}

/**
 * Validate a run sheet: same-owner overlaps, guest constraints, event length, min durations.
 * @example validateRunSheet(runSheet, 240).filter((v) => v.severity === 'hard')
 */
export function validateRunSheet(runSheet: RunSheet, eventDurationMin: number): Violation[] {
  const segs = runSheet.segments.filter(active);
  return [
    ...segs.flatMap((a) => segmentViolations(a, eventDurationMin)),
    ...ownerOverlaps(segs),
    ...constraintViolations(runSheet),
  ];
}

/**
 * Re-pack upcoming, unlocked segments back-to-back in the given order from the block's first start.
 * Locked, live, done and skipped segments keep their times.
 * @example repack(segments) // closes gaps left by a shortened or dropped segment
 */
export function repack(segments: Segment[]): Segment[] {
  const movable = segments.filter((s) => s.status === 'upcoming' && !s.locked);
  if (movable.length === 0) return segments;
  let cursor = Math.min(...movable.map((s) => s.offsetMin));
  const newOffset = new Map<string, number>();
  for (const s of movable) {
    newOffset.set(s.id, cursor);
    cursor += s.durationMin;
  }
  return segments.map((s) =>
    newOffset.has(s.id) ? { ...s, offsetMin: newOffset.get(s.id) ?? s.offsetMin } : s,
  );
}

/**
 * Segments sorted by start time (stable for equal starts).
 * @example sortByOffset(segments)[0]?.offsetMin // 0
 */
export function sortByOffset(segments: Segment[]): Segment[] {
  return [...segments].sort((a, b) => a.offsetMin - b.offsetMin);
}
