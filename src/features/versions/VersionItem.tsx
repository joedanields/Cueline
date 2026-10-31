import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';

type Props = {
  version: { id: string; at: string; reason: string };
  confirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onRestore: () => void;
};

/** Restoring replaces the whole plan, so it asks first and moves focus to the confirm button. */
function ConfirmRestore({
  reason,
  onRestore,
  onCancel,
}: { reason: string } & Pick<Props, 'onRestore' | 'onCancel'>) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => confirmRef.current?.focus(), []);
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={`Confirm restoring ${reason}`}
    >
      <span>Replace your current plan with this version?</span>
      <Button ref={confirmRef} variant="primary" onClick={onRestore}>
        Yes, restore
      </Button>
      <Button onClick={onCancel}>Cancel</Button>
    </div>
  );
}

/** One saved version: why and when it was saved, with a confirmed Restore. */
export function VersionItem({ version: v, confirming, onAsk, onCancel, onRestore }: Props) {
  return (
    <li className="card flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="font-semibold">{v.reason}</p>
        <p className="text-sm text-muted">
          <time dateTime={v.at}>{format(new Date(v.at), 'd MMM yyyy, HH:mm')}</time>
        </p>
      </div>
      {confirming ? (
        <ConfirmRestore reason={v.reason} onRestore={onRestore} onCancel={onCancel} />
      ) : (
        <Button onClick={onAsk}>
          Restore<span className="sr-only"> “{v.reason}”</span>
        </Button>
      )}
    </li>
  );
}
