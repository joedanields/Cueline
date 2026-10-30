import { useEffect, useState } from 'react';
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
  const [initial] = useState(() => (event ? draftFromEvent(event, locale()) : emptyDraft(locale())));
  const flow = useIntakeFlow(initial, Boolean(event));
  const { start } = flow;

  useEffect(() => {
    if (!event) void start();
    // Start once on mount; later navigation is driven by answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = flow.status === 'loading';
  return (
    <Page
      title="Event details"
      heading={event ? 'Edit event details' : 'Tell us about your celebration'}
      intro="One question at a time. Skip anything you don't know yet — you can change every answer later."
    >
      {flow.usingFallback ? (
        <p className="card text-sm">
          <span aria-hidden="true">ℹ </span>The assistant is unavailable, so you’re seeing the standard questions. Everything still works.
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
