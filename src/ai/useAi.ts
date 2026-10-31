import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiInput, AiOutput, AiTaskName } from '../shared/aiTasks';
import { useAnnounce } from '../components/ui/LiveRegion';
import { callAi, type AiError } from './client';

export type AiStatus = 'idle' | 'loading' | 'success' | 'error';

type Messages<T extends AiTaskName> = {
  /** Announced when the request starts, e.g. "Analysing guest list…". */
  loading: string;
  /** Announced on success, e.g. "Found 6 need groups"; null when the caller announces itself. */
  success: (data: AiOutput<T>) => string | null;
};

type State<T extends AiTaskName> = { status: AiStatus; data?: AiOutput<T>; error?: AiError };

/**
 * React wrapper around `callAi`: status, validated data, error, retry. Announces start, result and
 * errors via the shared LiveRegion. Aborts on unmount and when a newer request supersedes it.
 * @example const brief = useAi('helperBrief', { loading: 'Writing…', success: () => 'Done' });
 */
export function useAi<T extends AiTaskName>(task: T, messages: Messages<T>) {
  const announce = useAnnounce();
  const [state, setState] = useState<State<T>>({ status: 'idle' });
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
      setState((s) => ({ ...s, status: 'loading', error: undefined }));
      announce(messagesRef.current.loading);
      const result = await callAi(task, input, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return undefined;
      if (!result.ok) {
        setState((s) => ({ ...s, status: 'error', error: result.error }));
        announce(result.error.message, 'assertive');
        return undefined;
      }
      setState({ status: 'success', data: result.data });
      const message = messagesRef.current.success(result.data);
      if (message) announce(message);
      return result.data;
    },
    [announce, task],
  );

  const retry = useCallback(
    () => (lastInput.current ? run(lastInput.current) : Promise.resolve(undefined)),
    [run],
  );
  const reset = useCallback(() => {
    controller.current?.abort();
    setState({ status: 'idle' });
  }, []);

  return { ...state, run, retry, reset };
}
