import { clock } from '../liveLogic';

type Props = { startsAt: string; now: number; duration: number; onChange: (min: number) => void };

/** Simulated clock for rehearsing Live mode before the event starts. */
export function RehearsalClock({ startsAt, now, duration, onChange }: Props) {
  return (
    <div className="space-y-1 text-base">
      <label htmlFor="sim-clock" className="font-semibold">
        Rehearsal clock: {clock(startsAt, now)} ({now} min after start)
      </label>
      <input
        id="sim-clock"
        type="range"
        min={0}
        max={duration}
        step={5}
        value={now}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-[44px] w-full accent-accent"
        aria-valuetext={clock(startsAt, now)}
      />
    </div>
  );
}
