import type { AiOutput } from '../../shared/aiTasks';
import type { GuestConstraint, Helper, MealType, RunSheet, Segment } from '../../shared/schemas';
import { applyOp } from '../../engine/recoveryOps';
import { sortByOffset } from '../../engine/runSheet';
import { helperLabel } from '../helpers/helperLogic';

type Draft = AiOutput<'runSheet'>;
const MAX_SEGMENT = 600;

/**
 * AI run-sheet draft → RunSheet. Helper labels ("Helper B") map back to helper ids locally;
 * constraints pointing at unknown segments are dropped; minDuration never exceeds duration.
 * @example runSheetFromDraft(out, helpers).segments[0]?.id // 's_welcome'
 */
export function runSheetFromDraft(out: Draft, helpers: Helper[]): RunSheet {
  const byLabel = new Map(helpers.map((h, i) => [helperLabel(i).toLowerCase(), h.id]));
  const id = (key: string) => `s_${key}`.slice(0, 40);
  const keys = new Set(out.segments.map((s) => s.key));
  const segments: Segment[] = sortByOffset(
    out.segments.map((s) => ({
      id: id(s.key),
      title: s.title,
      offsetMin: s.offsetMin,
      durationMin: s.durationMin,
      minDurationMin: Math.min(s.minDurationMin, s.durationMin),
      cue: s.cue,
      priority: s.priority,
      optional: s.optional,
      ownerId:
        s.ownerLabel.toLowerCase() === 'organizer'
          ? 'organizer'
          : byLabel.get(s.ownerLabel.toLowerCase()),
      locked: false,
      status: 'upcoming' as const,
    })),
  );
  const constraints: GuestConstraint[] = out.constraints
    .filter((c) => keys.has(c.segmentKey) && (!c.otherSegmentKey || keys.has(c.otherSegmentKey)))
    .map((c, i) => ({
      id: `c_${i + 1}`,
      kind: c.kind,
      segmentId: id(c.segmentKey),
      minutesFromStart: c.minutesFromStart,
      otherSegmentId: c.otherSegmentKey ? id(c.otherSegmentKey) : undefined,
      reason: c.reason,
      needGroup: c.needGroup,
      severity: c.severity,
    }));
  return { segments, constraints, delayLog: [] };
}

type Spec = Pick<Segment, 'title' | 'priority' | 'optional' | 'cue'> & {
  key: string;
  minutes: number;
  min: number;
  /** Only included when lunch or dinner is served. */
  meal?: boolean;
};

const FALLBACK_SPECS: Spec[] = [
  {
    key: 'welcome',
    title: 'Welcome and seating',
    minutes: 30,
    min: 15,
    priority: 'comfort',
    optional: false,
    cue: 'Greet guests; seat those with access needs first.',
  },
  {
    key: 'meal',
    title: 'Main meal',
    minutes: 60,
    min: 40,
    priority: 'food',
    optional: false,
    cue: 'Serve seniors and special diets first.',
    meal: true,
  },
  {
    key: 'cake',
    title: 'Cake and speeches',
    minutes: 30,
    min: 15,
    priority: 'photos',
    optional: false,
    cue: 'Gather everyone; keep speeches short.',
  },
  {
    key: 'activities',
    title: 'Games and activities',
    minutes: 45,
    min: 15,
    priority: 'entertainment',
    optional: true,
    cue: 'Run activities away from the quiet zone.',
  },
  {
    key: 'farewell',
    title: 'Farewell',
    minutes: 20,
    min: 10,
    priority: 'comfort',
    optional: false,
    cue: 'Help seniors and families to their transport first.',
  },
];

/** Planned lengths may stretch or shrink to fit the event, but only within these bounds. */
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

type ConstraintRule = {
  need: string;
  segmentId: string;
  /** Allowed slack after the planned start (or end, for must_end_before), in minutes. */
  graceMin: number;
} & Pick<GuestConstraint, 'id' | 'kind' | 'reason' | 'needGroup' | 'severity'>;

const FALLBACK_RULES: ConstraintRule[] = [
  {
    id: 'c_senior_meal',
    need: 'age:senior',
    segmentId: 's_meal',
    kind: 'must_start_before',
    graceMin: 15,
    reason: 'Seniors eat on time',
    needGroup: 'senior',
    severity: 'hard',
  },
  {
    id: 'c_diabetic_meal',
    need: 'diet:diabetic_friendly',
    segmentId: 's_meal',
    kind: 'must_start_before',
    graceMin: 20,
    reason: 'Diabetic guests need regular meal times',
    needGroup: 'diabetic_friendly',
    severity: 'hard',
  },
  {
    id: 'c_kids',
    need: 'age:child',
    segmentId: 's_activities',
    kind: 'must_end_before',
    graceMin: 15,
    reason: 'Kids’ activities before they tire',
    needGroup: 'child',
    severity: 'soft',
  },
];

/** Lay the specs out back-to-back, scaled to the event length and clamped to each minimum. */
function layoutSegments(specs: Spec[], durationMin: number): Segment[] {
  const planned = specs.reduce((n, s) => n + s.minutes, 0);
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, durationMin / planned));
  let offset = 0;
  return specs.map(({ key, minutes, min, meal: _meal, ...rest }) => {
    const length = Math.min(MAX_SEGMENT, Math.max(min, Math.round(minutes * scale)));
    const seg: Segment = {
      ...rest,
      id: `s_${key}`,
      offsetMin: offset,
      durationMin: length,
      minDurationMin: min,
      locked: false,
      status: 'upcoming',
    };
    offset += length;
    return seg;
  });
}

/** One constraint per rule whose need group is present and whose segment exists. */
function constraintsFor(segments: Segment[], needs: Record<string, number>): GuestConstraint[] {
  return FALLBACK_RULES.flatMap(({ need, graceMin, ...rule }) => {
    const seg = segments.find((s) => s.id === rule.segmentId);
    if (!seg || (needs[need] ?? 0) <= 0) return [];
    const anchor =
      rule.kind === 'must_end_before' ? seg.offsetMin + seg.durationMin : seg.offsetMin;
    return [{ ...rule, minutesFromStart: anchor + graceMin }];
  });
}

/**
 * Deterministic run sheet when the AI is unavailable: welcome → meal → cake → activities → farewell,
 * scaled to the event length, with guest constraints derived from the need summary.
 * @example fallbackRunSheet(240, ['lunch'], { 'age:senior': 3 }).constraints[0]?.needGroup // 'senior'
 */
export function fallbackRunSheet(
  durationMin: number,
  meals: MealType[],
  needs: Record<string, number>,
): RunSheet {
  const hasMeal = meals.includes('lunch') || meals.includes('dinner');
  const specs = FALLBACK_SPECS.filter((s) => hasMeal || !s.meal);
  const segments = layoutSegments(specs, durationMin);
  return { segments, constraints: constraintsFor(segments, needs), delayLog: [] };
}

/**
 * Change a segment's length; later movable segments move by the same amount.
 * @example setDuration(segments, 's_toast', 20)
 */
export function setDuration(segments: Segment[], id: string, minutes: number): Segment[] {
  const s = segments.find((x) => x.id === id);
  if (!s) return segments;
  const next = Math.max(1, Math.min(MAX_SEGMENT, Math.round(minutes)));
  const delta = next - s.durationMin;
  const end = s.offsetMin + s.durationMin;
  return segments.map((x) => {
    if (x.id === id) return { ...x, durationMin: next };
    return x.status === 'upcoming' && !x.locked && x.offsetMin >= end
      ? { ...x, offsetMin: Math.max(0, x.offsetMin + delta) }
      : x;
  });
}

/**
 * Move a segment one place up or down (keyboard alternative to drag-and-drop).
 * Locked or started neighbours can't be swapped; returns the input unchanged then.
 * @example moveSegment(segments, 's_cake', 'up')
 */
export function moveSegment(segments: Segment[], id: string, direction: 'up' | 'down'): Segment[] {
  const order = sortByOffset(segments);
  const i = order.findIndex((s) => s.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  const a = order[i];
  const b = order[j];
  const movable = (s: Segment | undefined) => s && s.status === 'upcoming' && !s.locked;
  if (!a || !b || !movable(a) || !movable(b)) return segments;
  return applyOp(segments, { op: 'swap', a: a.id, b: b.id });
}
