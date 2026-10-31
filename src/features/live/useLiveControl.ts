import { useState } from 'react';
import { callAi } from '../../ai/client';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { advance, applyDelay, settle } from '../../engine/liveShift';
import {
  deterministicRecovery,
  rankRecovery,
  type RankedRecovery,
  type RecoveryCtx,
} from '../../engine/recovery';
import type { Segment } from '../../shared/schemas';
import { useStore } from '../../store';
import { appliedMessage, breakAnnouncement, describeBreaks, recoveryInput } from './liveLogic';

export type Pending = {
  delay: number;
  segments: Segment[];
  descriptions: string[];
  options: RankedRecovery[];
  source: 'ai' | 'quick';
  loading: boolean;
};

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;
const MAX_LOG = 200;

/** Save shifted segments and append a delay-log entry. */
function commit(segments: Segment[], minutes: number, note: string) {
  const { runSheet: sheet, setRunSheet } = useStore.getState();
  if (!sheet) return;
  const entry = { at: new Date().toISOString(), minutes, note: note.slice(0, 200) };
  setRunSheet({ ...sheet, segments, delayLog: [...sheet.delayLog, entry].slice(-MAX_LOG) });
}

/** AI options, validated and ranked by the engine; the Quick fix when the AI has nothing usable. */
async function aiRecovery(ctx: RecoveryCtx, now: number, quick: RankedRecovery[]) {
  const ai = await callAi('recovery', recoveryInput(ctx, now));
  const ranked = ai.ok ? rankRecovery(ai.data.options, ctx) : [];
  return ranked.length
    ? { options: ranked, source: 'ai' as const }
    : { options: quick, source: 'quick' as const };
}

/** Delay → shift → (if guest constraints break) AI recovery, validated + ranked; offline Quick fix. */
export function useLiveControl(now: number) {
  const announce = useAnnounce();
  const [pending, setPending] = useState<Pending>();

  const delay = async (minutes: number) => {
    const { runSheet: sheet, event } = useStore.getState();
    if (!sheet || !event || minutes <= 0) return;
    const shift = applyDelay(settle(sheet.segments, now), sheet.constraints, minutes);
    if (shift.breaks.length === 0) {
      commit(shift.segments, minutes, `Running ${minutes} min late`);
      return announce(`Schedule shifted by ${minutes} minutes. No conflicts.`);
    }
    const ctx = { ...shift, constraints: sheet.constraints, weights: event.weights };
    const descriptions = describeBreaks(ctx, event.startsAt);
    const quick = deterministicRecovery(ctx);
    const base = { delay: minutes, segments: shift.segments, descriptions };
    const quickOptions = quick.ok ? [quick.option] : [];
    setPending({ ...base, options: quickOptions, source: 'quick', loading: isOnline() });
    if (!isOnline())
      return announce(breakAnnouncement(descriptions, quickOptions.length), 'assertive');
    const result = await aiRecovery(ctx, now, quickOptions);
    setPending({ ...base, ...result, loading: false });
    announce(breakAnnouncement(descriptions, result.options.length), 'assertive');
  };

  const apply = (option: RankedRecovery | undefined) => {
    if (!pending) return;
    const segments = option ? option.segments : pending.segments;
    const late = `Running ${pending.delay} min late`;
    commit(segments, pending.delay, `${late} — ${option ? option.label : 'kept as is'}`);
    const { snapshot, event } = useStore.getState();
    snapshot(
      option ? `Recovery applied: ${option.label}` : `Delay of ${pending.delay} min applied`,
    );
    announce(appliedMessage(option?.label, segments, event?.startsAt ?? ''), 'assertive');
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
