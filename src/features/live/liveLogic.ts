import { addMinutes, format } from 'date-fns';
import type { AiInput } from '../../shared/aiTasks';
import type { GuestConstraint, PriorityWeights, Segment } from '../../shared/schemas';
import type { Break } from '../../engine/runSheet';

const MAX_SEGMENTS = 60;
const MAX_BREAKS = 30;

/** Clock time for an offset from the event start, e.g. "13:20". */
export const clock = (startsAt: string, offsetMin: number) =>
  format(addMinutes(new Date(startsAt), offsetMin), 'HH:mm');

/**
 * Plain-language description of one broken guest constraint.
 * @example describeBreak(c, segs, startsAt, 10) // "Seniors eat lunch by 13:20 — “Lunch service” would start at 13:30."
 */
export function describeBreak(
  c: GuestConstraint,
  segments: Segment[],
  startsAt: string,
  byMin: number,
): string {
  const seg = segments.find((s) => s.id === c.segmentId);
  if (!seg) return `${c.reason} — now ${byMin} min late.`;
  const when =
    c.kind === 'must_end_before'
      ? `end at ${clock(startsAt, seg.offsetMin + seg.durationMin)}`
      : `start at ${clock(startsAt, seg.offsetMin)}`;
  return `${c.reason} — “${seg.title}” would ${when}, ${byMin} min late.`;
}

/**
 * The assertive announcement when a delay breaks guest constraints.
 * @example breakAnnouncement(['…'], 3) // "… 3 recovery options available."
 */
export function breakAnnouncement(descriptions: string[], optionCount: number): string {
  const options =
    optionCount === 1
      ? '1 recovery option available.'
      : `${optionCount} recovery options available.`;
  return `${descriptions.join(' ')} ${optionCount ? options : 'No safe automatic fix — adjust manually.'}`;
}

/**
 * Recovery request: only structure (no names, no owners), remaining segments, and the breaks.
 * @example recoveryInput(segments, breaks, constraints, weights, 40).breaks[0]?.reason
 */
export function recoveryInput(
  segments: Segment[],
  breaks: Break[],
  constraints: GuestConstraint[],
  weights: PriorityWeights,
  nowOffsetMin: number,
): AiInput<'recovery'> {
  return {
    segments: segments
      .filter((s) => s.status !== 'done' && s.status !== 'skipped')
      .slice(0, MAX_SEGMENTS)
      .map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        offsetMin: s.offsetMin,
        durationMin: s.durationMin,
        minDurationMin: s.minDurationMin,
        priority: s.priority,
        optional: s.optional,
        locked: s.locked,
      })),
    breaks: breaks.slice(0, MAX_BREAKS).map((b) => ({
      constraintId: b.constraintId,
      reason: constraints.find((c) => c.id === b.constraintId)?.reason ?? 'Guest need',
      byMin: b.byMin,
    })),
    weights,
    nowOffsetMin: Math.max(0, Math.min(1440, Math.round(nowOffsetMin))),
  };
}
