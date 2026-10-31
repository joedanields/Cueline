import { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';

type Props = { message: string; count: number; onRetry: () => void; onAddWithoutAi: () => void };

/** AI failure: focus moves to Retry, and the same lines can always be added without AI. */
export function ImportError({ message, count, onRetry, onAddWithoutAi }: Props) {
  const retryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => retryRef.current?.focus(), []);
  return (
    <div className="space-y-2 rounded border-2 border-danger p-3">
      <p>
        <span aria-hidden="true">⚠ </span>
        {message}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button ref={retryRef} onClick={onRetry}>
          Retry
        </Button>
        <Button onClick={onAddWithoutAi}>Add {count} guests without AI</Button>
      </div>
    </div>
  );
}
