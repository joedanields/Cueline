import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiInput, AiOutput, AiTaskName } from '../shared/aiTasks';
import { useAnnounce } from '../components/ui/LiveRegion';
import { callAi, type AiError } from './client';

export type AiStatus = 'idle' | 'loading' | 'success' | 'error';

type Messages<T extends AiTaskName> = {
  /** Announced when the request starts, e.g. "Analysing guest list…". */
  loading: string;
  /** Announced on success, e.g. "Found 6 need groups". */
  success: (data: AiOutput<T>) => string;
};

/**
 * React wrapper around `callAi`: status, validated data, error, retry. Announces start, result and
 * errors via the shared LiveRegion. Aborts on unmount and when a newer request supersedes it.
 */
export function useAi<T extends AiTaskName>(task: T, messages: Messages<T>) {
  const announce = useAnnounce();
  const [status, setStatus] = useState<AiStatus>('idle');
  const [data, setData] = useState<AiOutput<T>>();
  const [error, setError] = useState<AiError>();
  const controller = useRef<AbortController | null>(null);
  const lastInput = useRef<AiInput<T> | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(
    async (input: AiInput<T>): Promise<AiOutput<T> | undefined> => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      lastInput.current = input;
      setStatus('loading');
      setError(undefined);
      announce(messagesRef.current.loading);
      const result = await callAi(task, input, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return undefined;
      if (result.ok) {
        setData(result.data);
        setStatus('success');
        announce(messagesRef.current.success(result.data));
        return result.data;
      }
      setError(result.error);
      setStatus('error');
      announce(result.error.message, 'assertive');
      return undefined;
    },
    [announce, task],
  );

  const retry = useCallback(() => (lastInput.current ? run(lastInput.current) : Promise.resolve(undefined)), [run]);
  const reset = useCallback(() => {
    controller.current?.abort();
    setStatus('idle');
    setData(undefined);
    setError(undefined);
  }, []);

  return { status, data, error, run, retry, reset };
}
