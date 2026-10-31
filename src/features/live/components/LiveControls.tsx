import { useEffect, useRef, useState } from 'react';
import { useKeyShortcut } from '../../../lib/useShortcuts';

const BIG = 'min-h-[56px] rounded border-2 px-4 text-xl font-bold';
const DELAYS = [5, 10, 15];
const QUICK_DELAY_MIN = 5;

type Props = {
  currentId?: string;
  onDelay: (minutes: number) => void;
  onMark: (segmentId: string, status: 'done' | 'skipped') => void;
};

/** "D" asks before adding 5 minutes, so a stray key press never shifts the whole day. */
function ConfirmDelay({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => confirmRef.current?.focus(), []);
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Confirm 5 minute delay"
    >
      <span>Add 5 minutes to the schedule?</span>
      <button ref={confirmRef} type="button" className={`${BIG} border-warn`} onClick={onConfirm}>
        Confirm +5
      </button>
      <button type="button" className={`${BIG} border-line`} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function CustomDelay({ onDelay }: Pick<Props, 'onDelay'>) {
  const [custom, setCustom] = useState('25');
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onDelay(Number(custom) || 0);
      }}
    >
      <label className="text-base">
        Custom delay (minutes)
        <input
          type="number"
          min={1}
          max={180}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="block min-h-[56px] w-28 rounded border-2 border-line bg-bg px-2 text-xl"
        />
      </label>
      <button type="submit" className={`${BIG} border-warn`}>
        Apply delay
      </button>
    </form>
  );
}

type ActionProps = { currentId: string; onMark: Props['onMark'] };

function SegmentActions({ currentId, onMark }: ActionProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`${BIG} border-ok`}
        onClick={() => onMark(currentId, 'done')}
      >
        ✓ Segment done
      </button>
      <button
        type="button"
        className={`${BIG} border-line`}
        onClick={() => onMark(currentId, 'skipped')}
      >
        Skip segment
      </button>
    </div>
  );
}

/** Big touch targets for the day: delays, a custom delay, and done/skip for the live segment. */
export function LiveControls({ currentId, onDelay, onMark }: Props) {
  const [confirming, setConfirming] = useState(false);
  useKeyShortcut('d', () => setConfirming(true));
  useKeyShortcut('n', () => currentId && onMark(currentId, 'done'));
  const confirm = () => {
    setConfirming(false);
    onDelay(QUICK_DELAY_MIN);
  };
  return (
    <div className="sticky bottom-0 space-y-3 bg-bg py-2" role="group" aria-label="Live controls">
      {confirming ? (
        <ConfirmDelay onConfirm={confirm} onCancel={() => setConfirming(false)} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {DELAYS.map((d) => (
          <button key={d} type="button" className={`${BIG} border-warn`} onClick={() => onDelay(d)}>
            Running late +{d}
          </button>
        ))}
      </div>
      <CustomDelay onDelay={onDelay} />
      {currentId ? <SegmentActions currentId={currentId} onMark={onMark} /> : null}
    </div>
  );
}
