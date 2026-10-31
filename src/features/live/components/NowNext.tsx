import type { Segment } from '../../../shared/schemas';
import { clock } from '../liveLogic';

type Props = {
  current?: Segment;
  next?: Segment;
  minutesLeft: number;
  startsAt: string;
  owner: (id?: string) => string;
};

const HEADING = 'text-base uppercase tracking-wide text-muted';

/** The current segment with its countdown, and what comes next. */
export function NowNext({ current, next, minutesLeft, startsAt, owner }: Props) {
  return (
    <>
      <section aria-labelledby="now-heading" className="space-y-1">
        <h2 id="now-heading" className={HEADING}>
          Now
        </h2>
        {current ? (
          <>
            <p className="text-4xl font-bold">{current.title}</p>
            <p>
              {owner(current.ownerId)}: {current.cue}
            </p>
            <p className="text-3xl font-bold tabular-nums">{minutesLeft} min left</p>
          </>
        ) : (
          <p>
            Between segments
            {next ? ` — next starts in ${minutesLeft} min` : ' — all done'}.
          </p>
        )}
      </section>
      {next ? (
        <section aria-labelledby="next-heading">
          <h2 id="next-heading" className={HEADING}>
            Next at {clock(startsAt, next.offsetMin)}
          </h2>
          <p className="font-bold">{next.title}</p>
          <p>
            {owner(next.ownerId)}: {next.cue}
          </p>
        </section>
      ) : null}
    </>
  );
}
