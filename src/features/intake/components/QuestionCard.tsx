import { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import type { IntakeDraft } from '../intakeLogic';
import { MAX_QUESTIONS } from '../intakeLogic';
import type { Question } from '../useIntakeFlow';
import { FieldInput } from './FieldInput';

type Props = {
  question: Question;
  number: number;
  draft: IntakeDraft;
  onChange: (patch: Partial<IntakeDraft>) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  canGoBack: boolean;
  busy: boolean;
};

/** One intake question. Focus moves to its heading when it appears so screen readers read it. */
export function QuestionCard({
  question,
  number,
  draft,
  onChange,
  onNext,
  onSkip,
  onBack,
  canGoBack,
  busy,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), [question.field]);

  return (
    <section aria-labelledby="question-heading" className="card space-y-4">
      <h2
        id="question-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-base font-semibold text-muted"
      >
        Question {number} of up to {MAX_QUESTIONS}
      </h2>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onNext();
        }}
      >
        <FieldInput
          field={question.field}
          label={question.question}
          options={question.options}
          draft={draft}
          onChange={onChange}
          idPrefix="q"
        />
        {question.why ? <p className="text-sm text-muted">Why we ask: {question.why}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={onBack} disabled={!canGoBack || busy}>
            Back
          </Button>
          <Button onClick={onSkip} disabled={busy}>
            Skip
          </Button>
          <Button type="submit" variant="primary" busy={busy} busyLabel="Thinking…">
            Next
          </Button>
        </div>
      </form>
    </section>
  );
}
