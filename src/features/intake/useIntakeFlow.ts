import { useCallback, useState } from 'react';
import { useAi } from '../../ai/useAi';
import { nextFallbackQuestion } from '../../ai/fallbacks';
import { INTAKE_FIELDS, type InputType, type IntakeField } from '../../shared/aiTasks';
import { MAX_QUESTIONS, missingRequired, toAiAnswers, type IntakeDraft } from './intakeLogic';

export type Question = {
  field: IntakeField;
  question: string;
  why: string;
  inputType: InputType;
  options?: string[];
};
type Mode = 'asking' | 'summary';

/** Treat every non-missing field as asked, so the static list yields only missing required ones. */
const onlyMissing = (asked: IntakeField[], missing: IntakeField[]): IntakeField[] => [
  ...asked,
  ...INTAKE_FIELDS.filter((f) => !missing.includes(f) && !asked.includes(f)),
];

/**
 * One-question-at-a-time intake state machine. The AI picks the next question; if it fails, the
 * static list takes over for the rest of the session. Required fields are always covered.
 */
export function useIntakeFlow(initialDraft: IntakeDraft, startInSummary: boolean) {
  const [draft, setDraft] = useState(initialDraft);
  const [asked, setAsked] = useState<IntakeField[]>([]);
  const [history, setHistory] = useState<Question[]>([]);
  const [current, setCurrent] = useState<Question | null>(null);
  const [mode, setMode] = useState<Mode>(startInSummary ? 'summary' : 'asking');
  const [usingFallback, setUsingFallback] = useState(false);
  const ai = useAi('intakeNext', {
    loading: 'Choosing the next question…',
    success: (d) => (d.done ? 'Enough to start planning.' : 'Next question ready.'),
  });

  const fromFallback = (nextAsked: IntakeField[], d: IntakeDraft): Question | null => {
    const q = nextFallbackQuestion(nextAsked, { venueType: d.venueType });
    return 'field' in q
      ? {
          field: q.field,
          question: q.question,
          why: q.why,
          inputType: q.inputType,
          options: q.options,
        }
      : null;
  };

  const pickNext = async (nextAsked: IntakeField[], d: IntakeDraft): Promise<Question | null> => {
    if (!usingFallback) {
      const out = await ai.run({ answers: toAiAnswers(d, nextAsked), asked: nextAsked });
      if (out) {
        if (!out.done && out.field && out.question && !nextAsked.includes(out.field)) {
          return {
            field: out.field,
            question: out.question,
            why: out.why ?? '',
            inputType: out.inputType ?? 'text',
            options: out.options,
          };
        }
        // The AI thinks we're done (or repeated itself): still cover required fields.
        return fromFallback(onlyMissing(nextAsked, missingRequired(d, nextAsked)), d);
      }
      setUsingFallback(true);
    }
    return fromFallback(nextAsked, d);
  };

  const advance = async (nextAsked: IntakeField[], d: IntakeDraft) => {
    const next = nextAsked.length >= MAX_QUESTIONS ? null : await pickNext(nextAsked, d);
    setCurrent(next);
    setMode(next ? 'asking' : 'summary');
  };

  /** Record the current answer (or a skip) and move on. */
  const answer = () => {
    if (!current) return;
    const nextAsked = [...asked, current.field];
    setAsked(nextAsked);
    setHistory((h) => [...h, current]);
    void advance(nextAsked, draft);
  };

  const back = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((h) => h.slice(0, -1));
    setAsked((a) => a.filter((f) => f !== previous.field));
    setCurrent(previous);
    setMode('asking');
  };

  const patch = useCallback((p: Partial<IntakeDraft>) => setDraft((d) => ({ ...d, ...p })), []);

  return {
    draft,
    patch,
    current,
    mode,
    asked,
    usingFallback,
    status: ai.status,
    canGoBack: history.length > 0,
    start: () => advance([], draft),
    answer,
    back,
    toSummary: () => setMode('summary'),
  };
}
