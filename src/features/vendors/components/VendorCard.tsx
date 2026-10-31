import { useAi } from '../../../ai/useAi';
import { useAnnounce } from '../../../components/ui/LiveRegion';
import { Button } from '../../../components/ui/Button';
import { Badge, SourceBadge } from '../../../components/ui/Badge';
import { needSummary } from '../../../engine/needs';
import { formatMoney } from '../../../lib/money';
import { QuoteStatus, type Quote, type Vendor } from '../../../shared/schemas';
import { useStore } from '../../../store';
import { selectNeedGroups } from '../../../store/selectors';
import { lineForVendor, mergeQuestions, sourceForQuote } from '../vendorLogic';
import { QuoteForm } from './QuoteForm';

/** Questions to ask (AI-suggested from guest needs, never answered by AI) and the quote log. */
export function VendorCard({ vendor: v }: { vendor: Vendor }) {
  const event = useStore((s) => s.event);
  const groups = useStore(selectNeedGroups);
  const upsertVendor = useStore((s) => s.upsertVendor);
  const removeVendor = useStore((s) => s.removeVendor);
  const announce = useAnnounce();
  const ai = useAi('vendorQuestions', {
    loading: `Suggesting questions for ${v.type}…`,
    success: (d) => `${d.questions.length} questions suggested.`,
  });
  const currency = event?.budget.currency ?? 'USD';

  const save = (next: Vendor) => {
    upsertVendor(next);
    const line = lineForVendor(next, useStore.getState().budget);
    if (line) {
      useStore.getState().upsertBudgetLine(line);
      announce(
        `Budget line for ${next.name || next.type} is now ${line.source === 'confirmed' ? 'Confirmed' : 'a Quote'}.`,
      );
    }
  };
  const suggest = async () => {
    const out = await ai.run({
      vendorType: v.type,
      needSummary: needSummary(groups),
      venueType: event?.venueType ?? 'other',
      occasion: event?.occasion ?? 'Celebration',
    });
    if (out)
      upsertVendor({
        ...v,
        questions: mergeQuestions(
          v.questions,
          out.questions.map((q) => q.text),
        ),
      });
  };
  const setQuote = (i: number, patch: Partial<Quote>) =>
    save({ ...v, quotes: v.quotes.map((q, n) => (n === i ? { ...q, ...patch } : q)) });

  return (
    <article aria-labelledby={`vendor-${v.id}`} className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`vendor-${v.id}`}>
          {v.name || 'Unnamed'} <span className="text-base font-normal text-muted">· {v.type}</span>
        </h2>
        <button
          type="button"
          className="min-h-[44px] text-danger underline"
          onClick={() => removeVendor(v.id)}
        >
          Remove<span className="sr-only"> {v.name}</span>
        </button>
      </div>
      <section aria-label={`Questions for ${v.name || v.type}`} className="space-y-2">
        <h3>Questions to ask</h3>
        {v.questions.length === 0 ? (
          <p className="text-muted">No questions yet.</p>
        ) : (
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
                    onChange={(e) =>
                      upsertVendor({
                        ...v,
                        questions: v.questions.map((x, n) =>
                          n === i ? { ...x, answer: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </label>
              </li>
            ))}
          </ol>
        )}
        <Button
          busy={ai.status === 'loading'}
          busyLabel="Suggesting…"
          onClick={() => void suggest()}
        >
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
      <section aria-label={`Quotes from ${v.name || v.type}`} className="space-y-2">
        <h3>Quotes</h3>
        {v.quotes.length === 0 ? (
          <p className="text-muted">
            No quotes logged. Cueline never assumes prices or availability.
          </p>
        ) : (
          <ul className="space-y-2">
            {v.quotes.map((q, i) => {
              const source = sourceForQuote(q);
              return (
                <li key={`${i}-${q.amount.amount}`} className="flex flex-wrap items-center gap-2">
                  <strong className="tabular-nums">{formatMoney(q.amount)}</strong>
                  {source ? (
                    <SourceBadge source={source} />
                  ) : (
                    <Badge tone="neutral" icon="✕">
                      Rejected
                    </Badge>
                  )}
                  <span className="text-sm text-muted">
                    {q.inclusions}
                    {q.validUntil ? ` · valid until ${q.validUntil}` : ''}
                  </span>
                  <select
                    aria-label={`Status of quote ${i + 1}`}
                    className="min-h-[44px] rounded border-2 border-line bg-bg px-2"
                    value={q.status}
                    onChange={(e) => setQuote(i, { status: QuoteStatus.parse(e.target.value) })}
                  >
                    {QuoteStatus.options.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
        <QuoteForm
          idPrefix={`quote-${v.id}`}
          vendorName={v.name || v.type}
          currency={currency}
          onAdd={(q) => save({ ...v, quotes: [...v.quotes, q] })}
        />
      </section>
    </article>
  );
}
