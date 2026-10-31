import { useState } from 'react';
import { callAi } from '../../ai/client';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { advance, applyDelay, settle } from '../../engine/liveShift';
import { deterministicRecovery, rankRecovery, type RankedRecovery } from '../../engine/recovery';
import type { Segment } from '../../shared/schemas';
import { useStore } from '../../store';
import { breakAnnouncement, clock, describeBreak, recoveryInput } from './liveLogic';

export type Pending = {
  delay: number;
  segments: Segment[];
  descriptions: string[];
  options: RankedRecovery[];
  source: 'ai' | 'quick';
  loading: boolean;
};

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

/** Delay → shift → (if guest constraints break) AI recovery, validated + ranked; offline Quick fix. */
export function useLiveControl(now: number) {
  const announce = useAnnounce();
  const [pending, setPending] = useState<Pending>();

  const commit = (segments: Segment[], delay: number, note: string) => {
    const sheet = useStore.getState().runSheet;
    if (!sheet) return;
    const entry = { at: new Date().toISOString(), minutes: delay, note: note.slice(0, 200) };
    useStore
      .getState()
      .setRunSheet({ ...sheet, segments, delayLog: [...sheet.delayLog, entry].slice(-200) });
  };

  const delay = async (minutes: number) => {
    const { runSheet: sheet, event } = useStore.getState();
    if (!sheet || !event || minutes <= 0) return;
    const shift = applyDelay(settle(sheet.segments, now), sheet.constraints, minutes);
    if (shift.breaks.length === 0) {
      commit(shift.segments, minutes, `Running ${minutes} min late`);
      return announce(`Schedule shifted by ${minutes} minutes. No conflicts.`);
    }
    const descriptions = shift.breaks.map((b) => {
      const c = sheet.constraints.find((x) => x.id === b.constraintId);
      return c ? describeBreak(c, shift.segments, event.startsAt, b.byMin) : '';
    });
    const ctx = {
      segments: shift.segments,
      constraints: sheet.constraints,
      weights: event.weights,
      breaks: shift.breaks,
    };
    const quick = deterministicRecovery(ctx);
    const quickOptions = quick.ok ? [quick.option] : [];
    setPending({
      delay: minutes,
      segments: shift.segments,
      descriptions,
      options: quickOptions,
      source: 'quick',
      loading: isOnline(),
    });
    if (!isOnline())
      return announce(breakAnnouncement(descriptions, quickOptions.length), 'assertive');

    const ai = await callAi(
      'recovery',
      recoveryInput(shift.segments, shift.breaks, sheet.constraints, event.weights, now),
    );
    const ranked = ai.ok ? rankRecovery(ai.data.options, ctx) : [];
    const options = ranked.length ? ranked : quickOptions;
    setPending({
      delay: minutes,
      segments: shift.segments,
      descriptions,
      options,
      source: ranked.length ? 'ai' : 'quick',
      loading: false,
    });
    announce(breakAnnouncement(descriptions, options.length), 'assertive');
  };

  const apply = (option: RankedRecovery | undefined) => {
    if (!pending) return;
    const segments = option ? option.segments : pending.segments;
    commit(
      segments,
      pending.delay,
      option
        ? `Running ${pending.delay} min late — ${option.label}`
        : `Running ${pending.delay} min late — kept as is`,
    );
    useStore
      .getState()
      .snapshot(
        option ? `Recovery applied: ${option.label}` : `Delay of ${pending.delay} min applied`,
      );
    const startsAt = useStore.getState().event?.startsAt ?? '';
    const next = segments
      .filter((s) => s.status === 'upcoming')
      .sort((a, b) => a.offsetMin - b.offsetMin)[0];
    announce(
      `${option ? `Applied: ${option.label}.` : 'Delay applied without changes.'}${next ? ` Next: ${next.title} at ${clock(startsAt, next.offsetMin)}.` : ''} Cue cards updated.`,
      'assertive',
    );
    setPending(undefined);
  };

  const mark = (segmentId: string, status: 'done' | 'skipped') => {
    const sheet = useStore.getState().runSheet;
    if (!sheet) return;
    const segments = advance(settle(sheet.segments, now), segmentId, status);
    useStore.getState().setRunSheet({ ...sheet, segments });
    const live = segments.find((s) => s.status === 'live');
    announce(`${status === 'done' ? 'Done' : 'Skipped'}.${live ? ` Now: ${live.title}.` : ''}`);
  };

  return { pending, delay, apply, mark, cancel: () => setPending(undefined) };
}
