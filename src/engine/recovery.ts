import type {
  GuestConstraint,
  PriorityWeights,
  RecoveryOp,
  RecoveryOption,
  Segment,
} from '../shared/schemas';
import { SCORE_HARD_FIX, SCORE_SOFT_FIX } from './constants';
import { findBreaks, type Break } from './runSheet';
import { applyOp, checkOp } from './recoveryOps';

export type RankedRecovery = RecoveryOption & {
  score: number;
  breaksFixed: number;
  minutesLost: number;
  weightedMinutesLost: number;
  /** Hard guest constraints still broken after applying — shown last, with a warning. */
  hardRemaining: number;
  impact: string[];
  segments: Segment[];
};

export type EvaluateResult = { ok: true; ranked: RankedRecovery } | { ok: false; reason: string };

/** Everything recovery needs: the shifted segments, their guest constraints and current breaks. */
export type RecoveryCtx = {
  segments: Segment[];
  constraints: GuestConstraint[];
  weights: PriorityWeights;
  breaks: Break[];
};

const MAX_OPS = 6;
const severityOf = (constraints: GuestConstraint[], id: string) =>
  constraints.find((c) => c.id === id)?.severity;

/**
 * Apply and score one option. Any invalid op discards the whole option.
 * score = hardFixed×100 + softFixed×20 − Σ weight[priority] × minutes lost.
 * @example evaluateOption(option, ctx).ok
 */
export function evaluateOption(option: RecoveryOption, ctx: RecoveryCtx): EvaluateResult {
  let segs = ctx.segments;
  let lost = 0;
  let weighted = 0;
  const impact: string[] = [];
  for (const op of option.ops) {
    const check = checkOp(op, segs, ctx.constraints);
    if (!check.ok) return { ok: false, reason: check.reason };
    const seg = segs.find((s) => s.id === ('segmentId' in op ? op.segmentId : op.a));
    const minutes = op.op === 'shorten' ? op.byMin : op.op === 'drop' ? (seg?.durationMin ?? 0) : 0;
    lost += minutes;
    weighted += minutes * (seg ? ctx.weights[seg.priority] : 0);
    impact.push(describeOp(op, segs));
    segs = applyOp(segs, op);
  }
  const after = findBreaks(segs, ctx.constraints);
  const count = (list: Break[], sev: 'hard' | 'soft') =>
    list.filter((b) => severityOf(ctx.constraints, b.constraintId) === sev).length;
  const hardFixed = count(ctx.breaks, 'hard') - count(after, 'hard');
  const softFixed = count(ctx.breaks, 'soft') - count(after, 'soft');
  const afterIds = new Set(after.map((b) => b.constraintId));
  return {
    ok: true,
    ranked: {
      ...option,
      segments: segs,
      impact,
      minutesLost: lost,
      weightedMinutesLost: weighted,
      hardRemaining: count(after, 'hard'),
      breaksFixed: ctx.breaks.filter((b) => !afterIds.has(b.constraintId)).length,
      score: hardFixed * SCORE_HARD_FIX + softFixed * SCORE_SOFT_FIX - weighted,
    },
  };
}

/**
 * Validate, score and order options: ones that leave no hard break first, then higher score,
 * then fewer weighted minutes lost. Invalid options are dropped.
 * @example rankRecovery(aiOptions, ctx)[0]?.label
 */
export function rankRecovery(options: RecoveryOption[], ctx: RecoveryCtx): RankedRecovery[] {
  return options
    .map((o) => evaluateOption(o, ctx))
    .flatMap((r) => (r.ok ? [r.ranked] : []))
    .sort(
      (a, b) =>
        Number(a.hardRemaining > 0) - Number(b.hardRemaining > 0) ||
        b.score - a.score ||
        a.weightedMinutesLost - b.weightedMinutesLost,
    );
}

export type FallbackResult = { ok: true; option: RankedRecovery } | { ok: false; reason: string };

const NO_SAFE_FIX: FallbackResult = {
  ok: false,
  reason: 'No safe automatic fix. Adjust the run sheet manually or accept the delay.',
};

/** Hard breaks first, so the shared op budget goes to the guest needs that matter most. */
function hardFirst(ctx: RecoveryCtx) {
  const soft = (id: string) => Number(severityOf(ctx.constraints, id) === 'soft');
  return [...ctx.breaks].sort((a, b) => soft(a.constraintId) - soft(b.constraintId));
}

const isBeforeConstraint = (c: GuestConstraint | undefined): c is GuestConstraint =>
  c?.kind === 'must_start_before' || c?.kind === 'must_end_before';

/** Shorten-then-drop ops for every broken before-constraint, evaluated as one option. */
function shortenOption(ctx: RecoveryCtx) {
  const ops: RecoveryOp[] = [];
  let segs = ctx.segments;
  for (const brk of hardFirst(ctx)) {
    const c = ctx.constraints.find((x) => x.id === brk.constraintId);
    if (isBeforeConstraint(c)) segs = reduceBefore(segs, c, ctx, ops);
  }
  if (!ops.length) return undefined;
  const rationale = 'Shortens the lowest-priority segments first so guest needs stay on time.';
  const r = evaluateOption({ label: 'Quick fix', rationale, ops: ops.slice(0, MAX_OPS) }, ctx);
  return r.ok ? r.ranked : undefined;
}

/**
 * Offline "Quick fix": for each broken before-constraint, shorten the lowest-weighted earlier
 * segments, then drop optional ones, then try moving the protected segment earlier.
 * Always returns a valid option or an explicit "no safe fix".
 * @example deterministicRecovery(ctx) // { ok: true, option: { label: 'Quick fix', ... } }
 */
export function deterministicRecovery(ctx: RecoveryCtx): FallbackResult {
  const shortened = shortenOption(ctx);
  if (shortened?.hardRemaining === 0) return { ok: true, option: shortened };
  const moved = tryMoveEarlier(ctx);
  if (moved) return { ok: true, option: moved };
  if (shortened && shortened.breaksFixed > 0) return { ok: true, option: shortened };
  return NO_SAFE_FIX;
}

function remainingBreak(segs: Segment[], c: GuestConstraint): number {
  return findBreaks(segs, [c])[0]?.byMin ?? 0;
}

type Pass = { segs: Segment[]; c: GuestConstraint; ctx: RecoveryCtx; ops: RecoveryOp[] };

/** Apply `op` only if it is allowed and actually reduces the break; returns the new segments. */
function tryOp(p: Pass, op: RecoveryOp): Segment[] {
  if (!checkOp(op, p.segs, p.ctx.constraints).ok) return p.segs;
  const next = applyOp(p.segs, op);
  if (remainingBreak(next, p.c) >= remainingBreak(p.segs, p.c)) return p.segs;
  p.ops.push(op);
  return next;
}

function reduceBefore(
  start: Segment[],
  c: GuestConstraint,
  ctx: RecoveryCtx,
  ops: RecoveryOp[],
): Segment[] {
  const target = start.find((s) => s.id === c.segmentId);
  // Shortening earlier segments only helps if the protected segment can move earlier.
  if (!target || target.locked || target.status !== 'upcoming') return start;
  const candidates = start
    .filter((s) => s.offsetMin < target.offsetMin && s.id !== target.id)
    .sort((a, b) => ctx.weights[a.priority] - ctx.weights[b.priority] || a.offsetMin - b.offsetMin);
  const p: Pass = { segs: start, c, ctx, ops };
  const done = () => remainingBreak(p.segs, c) <= 0 || ops.length >= MAX_OPS;
  for (const s of candidates) {
    if (done()) break;
    const room = s.durationMin - s.minDurationMin;
    const byMin = Math.min(room, remainingBreak(p.segs, c));
    if (room > 0) p.segs = tryOp(p, { op: 'shorten', segmentId: s.id, byMin });
  }
  for (const s of candidates) {
    if (done()) break;
    p.segs = tryOp(p, { op: 'drop', segmentId: s.id });
  }
  return p.segs;
}

function tryMoveEarlier(ctx: RecoveryCtx): RankedRecovery | undefined {
  const firstUpcoming = [...ctx.segments]
    .filter((s) => s.status === 'upcoming' && !s.locked)
    .sort((a, b) => a.offsetMin - b.offsetMin)[0];
  for (const brk of ctx.breaks) {
    const c = ctx.constraints.find((x) => x.id === brk.constraintId);
    if (!c || !firstUpcoming || c.segmentId === firstUpcoming.id) continue;
    const option = {
      label: 'Quick fix',
      rationale: 'Moves the protected segment earlier so guest needs stay on time.',
      ops: [{ op: 'moveBefore' as const, segmentId: c.segmentId, beforeId: firstUpcoming.id }],
    };
    const r = evaluateOption(option, ctx);
    if (r.ok && r.ranked.hardRemaining === 0) return r.ranked;
  }
  return undefined;
}

function describeOp(op: RecoveryOp, segs: Segment[]): string {
  const title = (id: string) => `“${segs.find((s) => s.id === id)?.title ?? id}”`;
  switch (op.op) {
    case 'shorten':
      return `Shortens ${title(op.segmentId)} by ${op.byMin} min`;
    case 'drop':
      return `Drops ${title(op.segmentId)}`;
    case 'swap':
      return `Swaps ${title(op.a)} and ${title(op.b)}`;
    case 'moveBefore':
      return `Moves ${title(op.segmentId)} before ${title(op.beforeId)}`;
  }
}
