import type { GuestConstraint, RecoveryOp, Segment } from '../shared/schemas';
import { sortByOffset } from './runSheet';

export type OpCheck = { ok: true } | { ok: false; reason: string };

const movable = (s: Segment | undefined): s is Segment =>
  !!s && s.status === 'upcoming' && !s.locked;

const OK: OpCheck = { ok: true };
const fail = (reason: string): OpCheck => ({ ok: false, reason });

function checkShorten(s: Segment | undefined, byMin: number): OpCheck {
  const running = s?.status === 'upcoming' || s?.status === 'live';
  if (!s || s.locked || !running) return fail('Segment is locked, finished or unknown.');
  if (s.durationMin - byMin < s.minDurationMin)
    return fail(`“${s.title}” can’t go below ${s.minDurationMin} min.`);
  return OK;
}

function checkDrop(s: Segment | undefined, constraints: GuestConstraint[]): OpCheck {
  if (!movable(s)) return fail('Segment is locked, started or unknown.');
  if (!s.optional) return fail(`“${s.title}” is not optional.`);
  const protectsNeed = constraints.some((c) => c.severity === 'hard' && c.segmentId === s.id);
  return protectsNeed ? fail(`“${s.title}” protects a guest need.`) : OK;
}

/** Both ids differ and both segments can still be moved. */
const pairMovable = (byId: Map<string, Segment>, a: string, b: string) =>
  a !== b && movable(byId.get(a)) && movable(byId.get(b));

/**
 * Is this op allowed on the current segments? Never touches locked/done segments, never shortens
 * below minDuration, only drops optional segments without a hard guest constraint.
 * @example checkOp({ op: 'drop', segmentId: 's_lunch' }, segments, constraints) // { ok: false, ... }
 */
export function checkOp(
  op: RecoveryOp,
  segments: Segment[],
  constraints: GuestConstraint[],
): OpCheck {
  const byId = new Map(segments.map((s) => [s.id, s]));
  switch (op.op) {
    case 'shorten':
      return checkShorten(byId.get(op.segmentId), op.byMin);
    case 'drop':
      return checkDrop(byId.get(op.segmentId), constraints);
    case 'swap':
      return pairMovable(byId, op.a, op.b)
        ? OK
        : fail('Can only swap two different upcoming, unlocked segments.');
    case 'moveBefore':
      return pairMovable(byId, op.segmentId, op.beforeId)
        ? OK
        : fail('Can only move upcoming, unlocked segments.');
  }
}

/** Move every movable segment starting at/after `from` by `delta` minutes. */
function shiftFrom(segments: Segment[], from: number, delta: number, exceptId: string): Segment[] {
  return segments.map((s) =>
    s.id !== exceptId && movable(s) && s.offsetMin >= from
      ? { ...s, offsetMin: s.offsetMin + delta }
      : s,
  );
}

/** Re-sequence movable segments from position `from` in the new `order`, keeping the block start. */
function resequence(segments: Segment[], order: Segment[], from: number): Segment[] {
  let cursor = Math.min(...order.slice(from).map((s) => s.offsetMin));
  const offsets = new Map<string, number>();
  for (const s of order.slice(from)) {
    offsets.set(s.id, cursor);
    cursor += s.durationMin;
  }
  return segments.map((s) =>
    offsets.has(s.id) ? { ...s, offsetMin: offsets.get(s.id) ?? s.offsetMin } : s,
  );
}

/**
 * Apply one (already checked) op. Shorten/drop pull later segments earlier; swap/moveBefore
 * re-sequence the movable segments from the earliest affected one.
 * @example applyOp(segments, { op: 'shorten', segmentId: 's_toast', byMin: 5 })
 */
export function applyOp(segments: Segment[], op: RecoveryOp): Segment[] {
  if (op.op === 'shorten' || op.op === 'drop') {
    const s = segments.find((x) => x.id === op.segmentId);
    if (!s) return segments;
    const endMin = s.offsetMin + s.durationMin;
    const delta = op.op === 'shorten' ? op.byMin : s.durationMin;
    const updated = segments.map((x) =>
      x.id !== s.id
        ? x
        : op.op === 'shorten'
          ? { ...x, durationMin: x.durationMin - op.byMin }
          : { ...x, status: 'skipped' as const },
    );
    return shiftFrom(updated, endMin, -delta, s.id);
  }
  const order = sortByOffset(segments.filter(movable));
  const idx = (id: string) => order.findIndex((s) => s.id === id);
  const [x, y] = op.op === 'swap' ? [op.a, op.b] : [op.segmentId, op.beforeId];
  const i = idx(x);
  const j = idx(y);
  if (i < 0 || j < 0) return segments;
  const next = [...order];
  if (op.op === 'swap') {
    [next[i], next[j]] = [order[j] as Segment, order[i] as Segment];
  } else {
    const [moved] = next.splice(i, 1);
    next.splice(
      next.findIndex((s) => s.id === y),
      0,
      moved as Segment,
    );
  }
  return resequence(segments, next, Math.min(i, j));
}
