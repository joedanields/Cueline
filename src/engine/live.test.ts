import { describe, expect, it } from 'vitest';
import { constraintBreak, findBreaks, repack, validateRunSheet } from './runSheet';
import { advance, applyDelay, liveState, settle } from './liveShift';
import { deterministicRecovery, evaluateOption, rankRecovery } from './recovery';
import { applyOp, checkOp } from './recoveryOps';
import { buildDemoState } from '../data/demo';
import { makeConstraint, makeSegment } from '../../tests/fixtures/state';
import type { PriorityWeights, RecoveryOption, Segment } from '../shared/schemas';

const demo = buildDemoState(new Date('2030-01-01T09:00:00Z'));
const sheet = demo.runSheet ?? { segments: [], constraints: [], delayLog: [] };
const weights = demo.event?.weights as PriorityWeights;
const seg = (segs: Segment[], id: string) => segs.find((s) => s.id === id) as Segment;
/** Demo: cake arrives 25 min late, noticed during the toast (minute 40). */
const lateCake = () => {
  const settled = settle(sheet.segments, 40);
  const shift = applyDelay(settled, sheet.constraints, 25);
  return {
    ...shift,
    ctx: {
      segments: shift.segments,
      constraints: sheet.constraints,
      weights,
      breaks: shift.breaks,
    },
  };
};

describe('runSheet validation', () => {
  it('detects an overlap for the same owner', () => {
    const v = validateRunSheet(
      {
        segments: [
          makeSegment({ id: 'a', ownerId: 'h1' }),
          makeSegment({ id: 'b', ownerId: 'h1', offsetMin: 30 }),
        ],
        constraints: [],
        delayLog: [],
      },
      240,
    );
    expect(v).toContainEqual(
      expect.objectContaining({ segmentId: 'b', kind: 'overlap', severity: 'hard' }),
    );
  });

  it('reports overruns, min-duration errors and broken constraints with reasons', () => {
    const v = validateRunSheet(
      {
        segments: [makeSegment({ offsetMin: 200, durationMin: 60, minDurationMin: 90 })],
        constraints: [makeConstraint({ minutesFromStart: 100 })],
        delayLog: [],
      },
      240,
    );
    expect(v.map((x) => x.kind).sort()).toEqual(['constraint', 'min_duration', 'overrun']);
    expect(v.find((x) => x.kind === 'constraint')?.message).toMatch(/misses by 100 min/);
  });

  it('evaluates every constraint kind', () => {
    const a = makeSegment({ id: 'a', offsetMin: 0, durationMin: 60 });
    const b = makeSegment({ id: 'b', offsetMin: 90, durationMin: 30 });
    const byId = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    expect(
      constraintBreak(
        makeConstraint({ kind: 'must_end_before', segmentId: 'b', minutesFromStart: 100 }),
        byId,
      ),
    ).toBe(20);
    expect(
      constraintBreak(
        makeConstraint({ kind: 'must_not_overlap', segmentId: 'a', otherSegmentId: 'b' }),
        byId,
      ),
    ).toBe(0);
    expect(
      constraintBreak(
        makeConstraint({
          kind: 'max_wait',
          segmentId: 'b',
          otherSegmentId: 'a',
          minutesFromStart: 10,
        }),
        byId,
      ),
    ).toBe(20);
    expect(constraintBreak(makeConstraint({ kind: 'max_wait', segmentId: 'b' }), byId)).toBe(0);
    expect(constraintBreak(makeConstraint({ segmentId: 'missing' }), byId)).toBe(0);
    const overlapping = new Map([
      [a.id, a],
      ['c', makeSegment({ id: 'c', offsetMin: 50 })],
    ]);
    expect(
      constraintBreak(
        makeConstraint({ kind: 'must_not_overlap', segmentId: 'a', otherSegmentId: 'c' }),
        overlapping,
      ),
    ).toBe(10);
  });

  it('repacks movable segments back-to-back', () => {
    const out = repack([
      makeSegment({ id: 'a', offsetMin: 10, durationMin: 20 }),
      makeSegment({ id: 'b', offsetMin: 50, durationMin: 10 }),
    ]);
    expect(out.map((s) => s.offsetMin)).toEqual([10, 30]);
    const locked = [makeSegment({ locked: true })];
    expect(repack(locked)).toBe(locked);
  });
});

describe('liveShift', () => {
  it('treats a delay of 0 as a no-op', () => {
    const r = applyDelay(sheet.segments, sheet.constraints, 0);
    expect(r.segments).toBe(sheet.segments);
    expect(r.breaks).toEqual([]);
  });

  it('shifts only unlocked, upcoming segments (live runs long)', () => {
    const segs = settle(
      [
        makeSegment({ id: 'done', offsetMin: 0, durationMin: 10 }),
        makeSegment({ id: 'live', offsetMin: 10, durationMin: 20 }),
        makeSegment({ id: 'up', offsetMin: 30 }),
        makeSegment({ id: 'locked', offsetMin: 90, locked: true }),
      ],
      15,
    );
    const { segments } = applyDelay(segs, [], 10);
    expect(seg(segments, 'done')).toMatchObject({ status: 'done', offsetMin: 0 });
    expect(seg(segments, 'live')).toMatchObject({ offsetMin: 10, durationMin: 30 });
    expect(seg(segments, 'up').offsetMin).toBe(40);
    expect(seg(segments, 'locked').offsetMin).toBe(90);
  });

  it('detects the hard break with the correct byMin (demo: cake 25 min late)', () => {
    const { breaks } = lateCake();
    expect(breaks).toContainEqual({ constraintId: 'c_senior_lunch', byMin: 10 });
    expect(breaks.find((b) => b.constraintId === 'c_diabetic')).toBeUndefined();
  });

  it('reports the current and next segment and time left', () => {
    const state = liveState(sheet.segments, 50);
    expect(state.current?.id).toBe('s_cake');
    expect(state.next?.id).toBe('s_lunch');
    expect(state.minutesLeft).toBe(15);
    expect(liveState([], 5)).toEqual({ current: undefined, next: undefined, minutesLeft: 0 });
  });

  it('advances to the next segment when one is marked done', () => {
    const next = advance(settle(sheet.segments, 40), 's_toast', 'done');
    expect(seg(next, 's_cake').status).toBe('live');
    expect(
      settle(
        next.map((s) => (s.id === 's_cake' ? { ...s, status: 'live' as const } : s)),
        5,
      ).find((s) => s.id === 's_cake')?.status,
    ).toBe('upcoming');
  });
});

describe('recovery', () => {
  const opt = (ops: RecoveryOption['ops'], label = 'x'): RecoveryOption => ({
    label,
    rationale: 'r',
    ops,
  });

  it('discards invalid AI ops (below min, non-optional drop, locked)', () => {
    const { ctx } = lateCake();
    expect(evaluateOption(opt([{ op: 'shorten', segmentId: 's_cake', byMin: 15 }]), ctx).ok).toBe(
      false,
    );
    expect(evaluateOption(opt([{ op: 'drop', segmentId: 's_lunch' }]), ctx).ok).toBe(false);
    const locked = {
      ...ctx,
      segments: ctx.segments.map((s) => (s.id === 's_cake' ? { ...s, locked: true } : s)),
    };
    expect(evaluateOption(opt([{ op: 'shorten', segmentId: 's_cake', byMin: 5 }]), locked).ok).toBe(
      false,
    );
    expect(checkOp({ op: 'swap', a: 's_cake', b: 's_cake' }, ctx.segments, []).ok).toBe(false);
    expect(
      checkOp({ op: 'moveBefore', segmentId: 's_arrive', beforeId: 's_cake' }, ctx.segments, []).ok,
    ).toBe(false);
    expect(
      checkOp({ op: 'drop', segmentId: 's_kids' }, ctx.segments, [
        makeConstraint({ segmentId: 's_kids' }),
      ]).ok,
    ).toBe(false);
    expect(checkOp({ op: 'shorten', segmentId: 'nope', byMin: 1 }, ctx.segments, []).ok).toBe(
      false,
    );
  });

  it('prefers options that fix hard breaks; ties broken by fewer weighted minutes lost', () => {
    // Photos weighted 5 so trimming the toast is cheaper than trimming only the cake.
    const ctx = { ...lateCake().ctx, weights: { ...weights, photos: 5 } };
    const ranked = rankRecovery(
      [
        opt([{ op: 'drop', segmentId: 's_photos' }], 'Drop photos'),
        opt([{ op: 'moveBefore', segmentId: 's_lunch', beforeId: 's_cake' }], 'Lunch first'),
        opt([{ op: 'shorten', segmentId: 's_cake', byMin: 10 }], 'Shorter cake'),
        opt(
          [
            { op: 'shorten', segmentId: 's_toast', byMin: 5 },
            { op: 'shorten', segmentId: 's_cake', byMin: 5 },
          ],
          'Trim both',
        ),
      ],
      ctx,
    );
    expect(ranked.map((r) => r.label)).toEqual([
      'Lunch first',
      'Trim both',
      'Shorter cake',
      'Drop photos',
    ]);
    expect(ranked[0]?.hardRemaining).toBe(0);
    expect(ranked.at(-1)?.hardRemaining).toBe(1);
    expect(ranked[1]?.weightedMinutesLost).toBe(40);
    expect(ranked[1]?.impact).toEqual([
      'Shortens “Family welcome and toast” by 5 min',
      'Shortens “Cake cutting and song” by 5 min',
    ]);
  });

  it('applies swap and moveBefore by re-sequencing from the earliest affected segment', () => {
    const segs = [
      makeSegment({ id: 'a', offsetMin: 0, durationMin: 10 }),
      makeSegment({ id: 'b', offsetMin: 10, durationMin: 20 }),
      makeSegment({ id: 'c', offsetMin: 30, durationMin: 5 }),
    ];
    expect(applyOp(segs, { op: 'swap', a: 'a', b: 'c' }).map((s) => [s.id, s.offsetMin])).toEqual([
      ['a', 25],
      ['b', 5],
      ['c', 0],
    ]);
    expect(
      applyOp(segs, { op: 'moveBefore', segmentId: 'c', beforeId: 'b' }).map((s) => s.offsetMin),
    ).toEqual([0, 15, 10]);
    expect(applyOp(segs, { op: 'drop', segmentId: 'a' }).map((s) => s.offsetMin)).toEqual([
      0, 0, 20,
    ]);
    expect(applyOp(segs, { op: 'swap', a: 'a', b: 'zz' })).toBe(segs);
    expect(applyOp(segs, { op: 'shorten', segmentId: 'zz', byMin: 1 })).toBe(segs);
  });

  it('deterministic fallback returns a valid Quick fix for the demo delay', () => {
    const r = deterministicRecovery(lateCake().ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.option.label).toBe('Quick fix');
      expect(r.option.hardRemaining).toBe(0);
      expect(
        findBreaks(r.option.segments, sheet.constraints).some(
          (b) => b.constraintId === 'c_senior_lunch',
        ),
      ).toBe(false);
    }
  });

  it('deterministic fallback drops optional segments or moves the protected one when shortening is not enough', () => {
    const segs = [
      makeSegment({
        id: 'opt',
        offsetMin: 0,
        durationMin: 30,
        minDurationMin: 30,
        optional: true,
        priority: 'decor',
      }),
      makeSegment({ id: 'meal', offsetMin: 30, durationMin: 30 }),
    ];
    const c = makeConstraint({ segmentId: 'meal', minutesFromStart: 10 });
    const r = deterministicRecovery({
      segments: segs,
      constraints: [c],
      weights,
      breaks: findBreaks(segs, [c]),
    });
    expect(r.ok && r.option.hardRemaining).toBe(0);
    const fixed = [
      makeSegment({ id: 'x', offsetMin: 0, durationMin: 30, minDurationMin: 30 }),
      makeSegment({ id: 'meal', offsetMin: 30, durationMin: 30 }),
    ];
    const moved = deterministicRecovery({
      segments: fixed,
      constraints: [c],
      weights,
      breaks: findBreaks(fixed, [c]),
    });
    expect(moved.ok && moved.option.ops[0]?.op).toBe('moveBefore');
  });

  it('deterministic fallback says "no safe fix" when nothing can help', () => {
    const segs = [makeSegment({ id: 'meal', offsetMin: 30, durationMin: 30, locked: true })];
    const c = makeConstraint({ segmentId: 'meal', minutesFromStart: 10 });
    const r = deterministicRecovery({
      segments: segs,
      constraints: [c],
      weights,
      breaks: findBreaks(segs, [c]),
    });
    expect(r).toEqual({ ok: false, reason: expect.stringMatching(/no safe automatic fix/i) });
  });
});
