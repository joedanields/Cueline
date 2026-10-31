import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';
import { draftFromEvent, emptyDraft } from './intakeLogic';
import { useIntakeFlow } from './useIntakeFlow';
import { QuestionCard } from './components/QuestionCard';
import { SummaryCard } from './components/SummaryCard';

const locale = () => (typeof navigator === 'undefined' ? 'en-US' : navigator.language);

export default function IntakeScreen() {
  const event = useStore((s) => s.event);
  const confirmEvent = useStore((s) => s.confirmEvent);
  const navigate = useNavigate();
  const announce = useAnnounce();
  const [initial] = useState(() =>
    event ? draftFromEvent(event, locale()) : emptyDraft(locale()),
  );
  const [editing] = useState(() => Boolean(event));
  const flow = useIntakeFlow(initial, editing);
  const { start } = flow;
  const started = useRef(false);

  useEffect(() => {
    // Start once; later navigation is driven by answers, not by re-renders.
    if (started.current || editing) return;
    started.current = true;
    void start();
  }, [editing, start]);

  const busy = flow.status === 'loading';
  return (
    <Page
      title="Event details"
      heading={event ? 'Edit event details' : 'Tell us about your celebration'}
      intro="One question at a time. Skip anything you don't know yet — you can change every answer later."
    >
      {flow.usingFallback ? (
        <p className="card text-sm">
          <span aria-hidden="true">ℹ </span>The assistant is unavailable, so you’re seeing the
          standard questions. Everything still works.
        </p>
      ) : null}
      {flow.mode === 'asking' && flow.current ? (
        <>
          <QuestionCard
            question={flow.current}
            number={flow.asked.length + 1}
            draft={flow.draft}
            onChange={flow.patch}
            onNext={flow.answer}
            onSkip={flow.answer}
            onBack={flow.back}
            canGoBack={flow.canGoBack}
            busy={busy}
          />
          <Button variant="ghost" onClick={flow.toSummary}>
            Skip to the summary
          </Button>
        </>
      ) : null}
      {flow.mode === 'asking' && !flow.current ? (
        <div className="card min-h-[12rem]" aria-hidden="true">
          <p className="text-muted">Preparing your first question…</p>
        </div>
      ) : null}
      {flow.mode === 'summary' ? (
        <SummaryCard
          draft={flow.draft}
          onChange={flow.patch}
          onBack={flow.canGoBack ? flow.back : undefined}
          onConfirm={(e) => {
            confirmEvent(e);
            announce('Event details saved. Next, add your guests.');
            navigate('/guests');
          }}
        />
      ) : null}
    </Page>
  );
}
