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

type Spec = [
  key: string,
  title: string,
  minutes: number,
  min: number,
  priority: Segment['priority'],
  optional: boolean,
  cue: string,
];

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
  const specs: Spec[] = [
    [
      'welcome',
      'Welcome and seating',
      30,
      15,
      'comfort',
      false,
      'Greet guests; seat those with access needs first.',
    ],
    ...(hasMeal
      ? [
          [
            'meal',
            'Main meal',
            60,
            40,
            'food',
            false,
            'Serve seniors and special diets first.',
          ] as Spec,
        ]
      : []),
    ['cake', 'Cake and speeches', 30, 15, 'photos', false, 'Gather everyone; keep speeches short.'],
    [
      'activities',
      'Games and activities',
      45,
      15,
      'entertainment',
      true,
      'Run activities away from the quiet zone.',
    ],
    [
      'farewell',
      'Farewell',
      20,
      10,
      'comfort',
      false,
      'Help seniors and families to their transport first.',
    ],
  ];
  const planned = specs.reduce((n, s) => n + s[2], 0);
  const scale = Math.max(0.5, Math.min(2, durationMin / planned));
  let offset = 0;
  const segments: Segment[] = specs.map(([key, title, minutes, min, priority, optional, cue]) => {
    const durationMin = Math.min(MAX_SEGMENT, Math.max(min, Math.round(minutes * scale)));
    const seg: Segment = {
      id: `s_${key}`,
      title,
      offsetMin: offset,
      durationMin,
      minDurationMin: min,
      cue,
      priority,
      optional,
      locked: false,
      status: 'upcoming',
    };
    offset += durationMin;
    return seg;
  });
  const meal = segments.find((s) => s.id === 's_meal');
  const constraints: GuestConstraint[] = [];
  if (meal && (needs['age:senior'] ?? 0) > 0)
    constraints.push({
      id: 'c_senior_meal',
      kind: 'must_start_before',
      segmentId: meal.id,
      minutesFromStart: meal.offsetMin + 15,
      reason: 'Seniors eat on time',
      needGroup: 'senior',
      severity: 'hard',
    });
  if (meal && (needs['diet:diabetic_friendly'] ?? 0) > 0)
    constraints.push({
      id: 'c_diabetic_meal',
      kind: 'must_start_before',
      segmentId: meal.id,
      minutesFromStart: meal.offsetMin + 20,
      reason: 'Diabetic guests need regular meal times',
      needGroup: 'diabetic_friendly',
      severity: 'hard',
    });
  const act = segments.find((s) => s.id === 's_activities');
  if (act && (needs['age:child'] ?? 0) > 0)
    constraints.push({
      id: 'c_kids',
      kind: 'must_end_before',
      segmentId: act.id,
      minutesFromStart: act.offsetMin + act.durationMin + 15,
      reason: 'Kids’ activities before they tire',
      needGroup: 'child',
      severity: 'soft',
    });
  return { segments, constraints, delayLog: [] };
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
