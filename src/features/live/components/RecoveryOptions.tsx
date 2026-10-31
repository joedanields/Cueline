import { useEffect, useRef, useState } from 'react';
import type { RankedRecovery } from '../../../engine/recovery';
import type { Pending } from '../useLiveControl';

const KEEP = '__keep__';

type Props = {
  pending: Pending;
  onApply: (option: RankedRecovery | undefined) => void;
  onCancel: () => void;
};

/** Ranked recovery options as a native radio group (arrow keys move between them), then Apply. */
export function RecoveryOptions({ pending, onApply, onCancel }: Props) {
  const [choice, setChoice] = useState<string>(pending.options[0] ? '0' : KEEP);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  useEffect(() => setChoice(pending.options[0] ? '0' : KEEP), [pending.options]);

  return (
    <section
      aria-labelledby="recovery-heading"
      className="space-y-4 rounded-lg border-4 border-warn p-4"
    >
      <h2 id="recovery-heading" ref={headingRef} tabIndex={-1}>
        Running {pending.delay} min late breaks a guest need
      </h2>
      <ul className="space-y-1">
        {pending.descriptions.map((d) => (
          <li key={d}>
            <span aria-hidden="true">⚠ </span>
            {d}
          </li>
        ))}
      </ul>
      {pending.loading ? (
        <p>Asking the assistant for options… a Quick fix is ready below if you need it now.</p>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onApply(choice === KEEP ? undefined : pending.options[Number(choice)]);
        }}
      >
        <fieldset className="space-y-3">
          <legend className="font-semibold">
            {pending.source === 'ai' ? 'Ranked options (best first)' : 'Quick fix (works offline)'}
          </legend>
          {pending.options.map((o, i) => (
            <label
              key={`${o.label}-${i}`}
              className={`flex cursor-pointer gap-3 rounded border-2 p-3 ${choice === String(i) ? 'border-accent' : 'border-line'}`}
            >
              <input
                type="radio"
                name="recovery"
                value={i}
                checked={choice === String(i)}
                onChange={() => setChoice(String(i))}
                className="mt-2 h-6 w-6"
              />
              <span className="space-y-1">
                <span className="block font-bold">
                  {o.label}
                  {o.hardRemaining > 0 ? ' — ⚠ still misses a guest need' : ''}
                </span>
                <span className="block">{o.rationale}</span>
                <span className="block text-muted">{o.impact.join('; ')}</span>
              </span>
            </label>
          ))}
          <label
            className={`flex cursor-pointer gap-3 rounded border-2 p-3 ${choice === KEEP ? 'border-accent' : 'border-line'}`}
          >
            <input
              type="radio"
              name="recovery"
              value={KEEP}
              checked={choice === KEEP}
              onChange={() => setChoice(KEEP)}
              className="mt-2 h-6 w-6"
            />
            <span>Keep the delay and change nothing</span>
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="min-h-[56px] rounded bg-accent px-6 text-xl font-bold text-accent-fg"
          >
            Apply
          </button>
          <button
            type="button"
            className="min-h-[56px] rounded border-2 border-line px-6 text-xl"
            onClick={onCancel}
          >
            Cancel delay
          </button>
        </div>
      </form>
    </section>
  );
}
