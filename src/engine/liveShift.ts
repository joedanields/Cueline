import type { GuestConstraint, Segment } from '../shared/schemas';
import { findBreaks, sortByOffset, type Break } from './runSheet';

export type ShiftResult = { segments: Segment[]; breaks: Break[] };

const MAX_SEGMENT_MIN = 600;

/**
 * Apply a delay: every unlocked, upcoming segment moves later by `delayMin`, and the live segment
 * runs long by the same amount. Locked (fixed-time) and done/skipped segments stay.
 * Delay 0 is a no-op. Call `settle()` first so past segments aren't moved.
 * @example applyDelay(settle(segments, 40), constraints, 25).breaks // [{ constraintId: 'c_senior_lunch', byMin: 10 }]
 */
export function applyDelay(segments: Segment[], constraints: GuestConstraint[], delayMin: number): ShiftResult {
  const delay = Math.max(0, Math.round(delayMin));
  const shifted = delay === 0
    ? segments
    : segments.map((s) => {
        if (s.locked) return s;
        if (s.status === 'upcoming') return { ...s, offsetMin: s.offsetMin + delay };
        if (s.status === 'live') return { ...s, durationMin: Math.min(MAX_SEGMENT_MIN, s.durationMin + delay) };
        return s;
      });
  return { segments: shifted, breaks: findBreaks(shifted, constraints) };
}

export type LiveState = {
  current?: Segment;
  next?: Segment;
  /** Minutes until the current segment should end (or until the next starts if between segments). */
  minutesLeft: number;
};

/**
 * Where we are in the run sheet at `nowOffsetMin` minutes after the event start.
 * A segment marked live wins; otherwise the time window decides.
 * @example liveState(segments, 50).current?.title // 'Cake cutting and song'
 */
export function liveState(segments: Segment[], nowOffsetMin: number): LiveState {
  const remaining = sortByOffset(segments.filter((s) => s.status !== 'done' && s.status !== 'skipped'));
  const current =
    remaining.find((s) => s.status === 'live') ??
    remaining.find((s) => s.offsetMin <= nowOffsetMin && nowOffsetMin < s.offsetMin + s.durationMin);
  const next = remaining.find((s) => s !== current && s.offsetMin >= (current?.offsetMin ?? nowOffsetMin));
  const target = current ? current.offsetMin + current.durationMin : next?.offsetMin ?? nowOffsetMin;
  return { current, next, minutesLeft: Math.max(0, target - nowOffsetMin) };
}

/**
 * Mark a segment done (or skipped) and the following upcoming segment live.
 * @example advance(segments, 's_cake', 'done')
 */
export function advance(segments: Segment[], segmentId: string, status: 'done' | 'skipped'): Segment[] {
  const marked = segments.map((s) => (s.id === segmentId ? { ...s, status } : s));
  const nextUp = sortByOffset(marked).find((s) => s.status === 'upcoming');
  return marked.map((s) => (nextUp && s.id === nextUp.id && !marked.some((m) => m.status === 'live') ? { ...s, status: 'live' as const } : s));
}

/**
 * Bring statuses in line with the clock: segments that have ended become done, the one running
 * now becomes live. Skipped, done and locked-in-the-future segments are left alone.
 * @example settle(segments, 40).find((s) => s.status === 'live')?.title // 'Family welcome and toast'
 */
export function settle(segments: Segment[], nowOffsetMin: number): Segment[] {
  return segments.map((s) => {
    if (s.status === 'done' || s.status === 'skipped') return s;
    if (s.offsetMin + s.durationMin <= nowOffsetMin) return { ...s, status: 'done' as const };
    if (s.offsetMin <= nowOffsetMin) return { ...s, status: 'live' as const };
    return s.status === 'live' ? { ...s, status: 'upcoming' as const } : s;
  });
}
