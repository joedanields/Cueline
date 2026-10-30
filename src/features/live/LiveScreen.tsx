import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Page } from '../../components/ui/Page';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';
import { selectEventDurationMin } from '../../store/selectors';
import { liveState, settle } from '../../engine/liveShift';
import { LIVE_ANNOUNCE_THRESHOLD_MIN } from '../../engine/constants';
import { clock } from './liveLogic';
import { useLiveClock } from './useLiveClock';
import { useLiveControl } from './useLiveControl';
import { RecoveryOptions } from './components/RecoveryOptions';

const BIG = 'min-h-[56px] rounded border-2 px-4 text-xl font-bold';
const DELAYS = [5, 10, 15];

export default function LiveScreen() {
  const event = useStore((s) => s.event);
  const runSheet = useStore((s) => s.runSheet);
  const helpers = useStore((s) => s.helpers);
  const duration = useStore(selectEventDurationMin);
  const { now, rehearsal, setSimulated } = useLiveClock(event?.startsAt, duration);
  const control = useLiveControl(now);
  const announce = useAnnounce();
  const [custom, setCustom] = useState('25');
  const state = useMemo(() => liveState(settle(runSheet?.segments ?? [], now), now), [runSheet, now]);
  const owner = (id?: string) => (id === 'organizer' ? 'You' : helpers.find((h) => h.id === id)?.name ?? 'Unassigned');
  const announced = useRef({ id: '', soon: false });

  // Announce segment changes and the ≤ 5-minute mark only — never every tick.
  useEffect(() => {
    const id = state.current?.id ?? '';
    if (id !== announced.current.id) {
      announced.current = { id, soon: false };
      if (state.current) announce(`Now: ${state.current.title}.${state.next ? ` Next: ${state.next.title}.` : ''}`);
    } else if (state.current && state.minutesLeft <= LIVE_ANNOUNCE_THRESHOLD_MIN && !announced.current.soon) {
      announced.current.soon = true;
      announce(`${state.minutesLeft} minutes left in ${state.current.title}.`);
    }
  }, [announce, state]);

  if (!event || !runSheet) {
    return <Page title="Live"><p className="card">Live mode needs a <Link to="/runsheet" className="underline">run sheet</Link> first.</p></Page>;
  }
  return (
    <Page title="Live" heading="Live mode">
      <div className="theme-live space-y-6 rounded-lg bg-bg p-4 text-[1.5rem] leading-snug text-fg">
        {rehearsal ? (
          <div className="space-y-1 text-base">
            <label htmlFor="sim-clock" className="font-semibold">Rehearsal clock: {clock(event.startsAt, now)} ({now} min after start)</label>
            <input id="sim-clock" type="range" min={0} max={duration} step={5} value={now} onChange={(e) => setSimulated(Number(e.target.value))} className="min-h-[44px] w-full accent-accent" aria-valuetext={`${clock(event.startsAt, now)}`} />
          </div>
        ) : null}
        <section aria-labelledby="now-heading" className="space-y-1">
          <h2 id="now-heading" className="text-base uppercase tracking-wide text-muted">Now</h2>
          {state.current ? (
            <>
              <p className="text-4xl font-bold">{state.current.title}</p>
              <p>{owner(state.current.ownerId)}: {state.current.cue}</p>
              <p className="text-3xl font-bold tabular-nums">{state.minutesLeft} min left</p>
            </>
          ) : <p>Between segments{state.next ? ` — next starts in ${state.minutesLeft} min` : ' — all done'}.</p>}
        </section>
        {state.next ? (
          <section aria-labelledby="next-heading">
            <h2 id="next-heading" className="text-base uppercase tracking-wide text-muted">Next at {clock(event.startsAt, state.next.offsetMin)}</h2>
            <p className="font-bold">{state.next.title}</p>
            <p>{owner(state.next.ownerId)}: {state.next.cue}</p>
          </section>
        ) : null}
        {control.pending ? (
          <RecoveryOptions pending={control.pending} onApply={control.apply} onCancel={control.cancel} />
        ) : (
          <div className="sticky bottom-0 space-y-3 bg-bg py-2" role="group" aria-label="Live controls">
            <div className="flex flex-wrap gap-2">
              {DELAYS.map((d) => <button key={d} type="button" className={`${BIG} border-warn`} onClick={() => void control.delay(d)}>Running late +{d}</button>)}
            </div>
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void control.delay(Number(custom) || 0); }}>
              <label className="text-base">Custom delay (minutes)
                <input type="number" min={1} max={180} value={custom} onChange={(e) => setCustom(e.target.value)} className="block min-h-[56px] w-28 rounded border-2 border-line bg-bg px-2 text-xl" />
              </label>
              <button type="submit" className={`${BIG} border-warn`}>Apply delay</button>
            </form>
            {state.current ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={`${BIG} border-ok`} onClick={() => state.current && control.mark(state.current.id, 'done')}>✓ Segment done</button>
                <button type="button" className={`${BIG} border-line`} onClick={() => state.current && control.mark(state.current.id, 'skipped')}>Skip segment</button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Page>
  );
}
