import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';

/** Two-step "Delete all my data" so a single mis-click can't wipe a plan. */
export function DeleteDataPanel() {
  const deleteAllData = useStore((s) => s.deleteAllData);
  const announce = useAnnounce();
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const cancel = () => {
    setConfirming(false);
    queueMicrotask(() => startRef.current?.focus());
  };

  return (
    <section aria-labelledby="privacy-heading" className="card space-y-3">
      <h2 id="privacy-heading">Your data</h2>
      <p className="text-muted">
        Everything is stored only in this browser. Guest names are replaced with codes before any AI
        request.
      </p>
      {confirming ? (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Confirm deletion"
        >
          <p className="w-full font-semibold">
            Delete the whole plan and its history? This cannot be undone.
          </p>
          <Button
            ref={confirmRef}
            variant="danger"
            onClick={() => {
              deleteAllData();
              setConfirming(false);
              announce('All your data was deleted from this browser.');
            }}
          >
            Yes, delete everything
          </Button>
          <Button onClick={cancel}>Cancel</Button>
        </div>
      ) : (
        <Button ref={startRef} variant="danger" onClick={() => setConfirming(true)}>
          Delete all my data
        </Button>
      )}
    </section>
  );
}
