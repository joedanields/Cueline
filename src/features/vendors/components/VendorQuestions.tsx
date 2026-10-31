import { useAi } from '../../../ai/useAi';
import { Button } from '../../../components/ui/Button';
import { needSummary } from '../../../engine/needs';
import type { Vendor } from '../../../shared/schemas';
import { useStore } from '../../../store';
import { selectNeedGroups } from '../../../store/selectors';
import { mergeQuestions } from '../vendorLogic';

type Props = { vendor: Vendor; onChange: (next: Vendor) => void };

function QuestionList({ vendor: v, onChange }: Props) {
  if (v.questions.length === 0) return <p className="text-muted">No questions yet.</p>;
  const setAnswer = (i: number, answer: string) =>
    onChange({ ...v, questions: v.questions.map((x, n) => (n === i ? { ...x, answer } : x)) });
  return (
    <ol className="list-decimal space-y-2 pl-6">
      {v.questions.map((q, i) => (
        <li key={q.text}>
          <p>{q.text}</p>
          <label className="block text-sm">
            Their answer
            <input
              className="mt-1 block min-h-[44px] w-full rounded border-2 border-line bg-bg px-2"
              value={q.answer ?? ''}
              maxLength={500}
              onChange={(e) => setAnswer(i, e.target.value)}
            />
          </label>
        </li>
      ))}
    </ol>
  );
}

/** Questions to ask, suggested from guest needs. The AI never answers them or assumes prices. */
export function VendorQuestions({ vendor: v, onChange }: Props) {
  const event = useStore((s) => s.event);
  const groups = useStore(selectNeedGroups);
  const ai = useAi('vendorQuestions', {
    loading: `Suggesting questions for ${v.type}…`,
    success: (d) => `${d.questions.length} questions suggested.`,
  });
  const suggest = async () => {
    const out = await ai.run({
      vendorType: v.type,
      needSummary: needSummary(groups),
      venueType: event?.venueType ?? 'other',
      occasion: event?.occasion ?? 'Celebration',
    });
    const texts = out?.questions.map((q) => q.text);
    if (texts) onChange({ ...v, questions: mergeQuestions(v.questions, texts) });
  };

  return (
    <section aria-label={`Questions for ${v.name || v.type}`} className="space-y-2">
      <h3>Questions to ask</h3>
      <QuestionList vendor={v} onChange={onChange} />
      <Button busy={ai.status === 'loading'} busyLabel="Suggesting…" onClick={() => void suggest()}>
        Suggest questions from guest needs
      </Button>
      {ai.status === 'error' ? (
        <p>
          <span aria-hidden="true">⚠ </span>
          {ai.error?.message}{' '}
          <button type="button" className="underline" onClick={() => void ai.retry()}>
            Retry
          </button>
        </p>
      ) : null}
    </section>
  );
}
