import { useEffect, useState } from 'react';

const TICK_MS = 15_000;
const MS_PER_MIN = 60_000;

/**
 * Minutes since the event started. Outside the event window the screen runs in rehearsal mode
 * with a clock the organizer sets by hand (also how the demo is presented).
 */
export function useLiveClock(startsAt: string | undefined, durationMin: number) {
  const [wall, setWall] = useState(() => Date.now());
  const [simulated, setSimulated] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWall(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const real = startsAt ? Math.floor((wall - Date.parse(startsAt)) / MS_PER_MIN) : -1;
  const rehearsal = real < 0 || real > durationMin;
  return { now: rehearsal ? simulated : real, rehearsal, setSimulated: (m: number) => setSimulated(Math.max(0, Math.min(durationMin, Math.round(m)))) };
}
