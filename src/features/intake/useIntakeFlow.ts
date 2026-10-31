import { useCallback, useState } from 'react';
import { useAi } from '../../ai/useAi';
import { nextFallbackQuestion } from '../../ai/fallbacks';
import {
  INTAKE_FIELDS,
  type AiOutput,
  type InputType,
  type IntakeField,
} from '../../shared/aiTasks';
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

function fromFallback(nextAsked: IntakeField[], d: IntakeDraft): Question | null {
  const q = nextFallbackQuestion(nextAsked, { venueType: d.venueType });
  if (!('field' in q)) return null;
  const { field, question, why, inputType, options } = q;
  return { field, question, why, inputType, options };
}

/** Use the AI's question unless it says "done" or repeats itself; required fields are still covered. */
function fromAi(out: AiOutput<'intakeNext'>, nextAsked: IntakeField[], d: IntakeDraft) {
  if (!out.done && out.field && out.question && !nextAsked.includes(out.field)) {
    const { field, question, why = '', inputType = 'text', options } = out;
    return { field, question, why, inputType, options };
  }
  return fromFallback(onlyMissing(nextAsked, missingRequired(d, nextAsked)), d);
}

type Nav = { asked: IntakeField[]; history: Question[]; current: Question | null; mode: Mode };

/**
 * One-question-at-a-time intake state machine. The AI picks the next question; if it fails, the
 * static list takes over for the rest of the session. Required fields are always covered.
 * @example const flow = useIntakeFlow(emptyDraft('en-IN'), false); void flow.start();
 */
export function useIntakeFlow(initialDraft: IntakeDraft, startInSummary: boolean) {
  const [draft, setDraft] = useState(initialDraft);
  const [nav, setNav] = useState<Nav>({
    asked: [],
    history: [],
    current: null,
    mode: startInSummary ? 'summary' : 'asking',
  });
  const [usingFallback, setUsingFallback] = useState(false);
  const ai = useAi('intakeNext', {
    loading: 'Choosing the next question…',
    success: (d) => (d.done ? 'Enough to start planning.' : 'Next question ready.'),
  });

  const pickNext = async (nextAsked: IntakeField[], d: IntakeDraft): Promise<Question | null> => {
    if (nextAsked.length >= MAX_QUESTIONS) return null;
    if (usingFallback) return fromFallback(nextAsked, d);
    const out = await ai.run({ answers: toAiAnswers(d, nextAsked), asked: nextAsked });
    if (out) return fromAi(out, nextAsked, d);
    setUsingFallback(true);
    return fromFallback(nextAsked, d);
  };

  const advance = async (nextAsked: IntakeField[], d: IntakeDraft) => {
    const next = await pickNext(nextAsked, d);
    setNav((n) => ({ ...n, current: next, mode: next ? 'asking' : 'summary' }));
  };

  /** Record the current answer (or a skip) and move on. */
  const answer = () => {
    const { current, asked, history } = nav;
    if (!current) return;
    const nextAsked = [...asked, current.field];
    setNav((n) => ({ ...n, asked: nextAsked, history: [...history, current] }));
    void advance(nextAsked, draft);
  };

  const back = () => {
    const previous = nav.history.at(-1);
    if (!previous) return;
    setNav((n) => ({
      asked: n.asked.filter((f) => f !== previous.field),
      history: n.history.slice(0, -1),
      current: previous,
      mode: 'asking',
    }));
  };

  const patch = useCallback((p: Partial<IntakeDraft>) => setDraft((d) => ({ ...d, ...p })), []);

  return {
    ...nav,
    draft,
    patch,
    usingFallback,
    status: ai.status,
    canGoBack: nav.history.length > 0,
    start: () => advance([], draft),
    answer,
    back,
    toSummary: () => setNav((n) => ({ ...n, mode: 'summary' })),
  };
}
