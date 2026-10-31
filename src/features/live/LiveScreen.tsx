import { useMemo } from 'react';
import { Page } from '../../components/ui/Page';
import { NeedsFirst } from '../../components/ui/NeedsFirst';
import { useStore } from '../../store';
import { selectEventDurationMin } from '../../store/selectors';
import { liveState, settle } from '../../engine/liveShift';
import { useLiveClock } from './useLiveClock';
import { useLiveControl } from './useLiveControl';
import { useSegmentAnnouncements } from './useSegmentAnnouncements';
import { RecoveryOptions } from './components/RecoveryOptions';
import { RehearsalClock } from './components/RehearsalClock';
import { NowNext } from './components/NowNext';
import { LiveControls } from './components/LiveControls';

export default function LiveScreen() {
  const event = useStore((s) => s.event);
  const runSheet = useStore((s) => s.runSheet);
  const helpers = useStore((s) => s.helpers);
  const duration = useStore(selectEventDurationMin);
  const { now, rehearsal, setSimulated } = useLiveClock(event?.startsAt, duration);
  const control = useLiveControl(now);
  const state = useMemo(
    () => liveState(settle(runSheet?.segments ?? [], now), now),
    [runSheet, now],
  );
  useSegmentAnnouncements(state);
  const owner = (id?: string) =>
    id === 'organizer' ? 'You' : (helpers.find((h) => h.id === id)?.name ?? 'Unassigned');

  if (!event || !runSheet)
    return <NeedsFirst title="Live" before="Live mode needs a" to="/runsheet" link="run sheet" />;
  return (
    <Page title="Live" heading="Live mode">
      <div className="theme-live space-y-6 rounded-lg bg-bg p-4 text-[1.5rem] leading-snug text-fg">
        {rehearsal ? (
          <RehearsalClock
            startsAt={event.startsAt}
            now={now}
            duration={duration}
            onChange={setSimulated}
          />
        ) : null}
        <NowNext {...state} startsAt={event.startsAt} owner={owner} />
        {control.pending ? (
          <RecoveryOptions
            pending={control.pending}
            onApply={control.apply}
            onCancel={control.cancel}
          />
        ) : (
          <LiveControls
            currentId={state.current?.id}
            onDelay={(m) => void control.delay(m)}
            onMark={control.mark}
          />
        )}
      </div>
    </Page>
  );
}
