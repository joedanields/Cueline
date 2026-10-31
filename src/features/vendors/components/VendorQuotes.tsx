import { Badge, SourceBadge } from '../../../components/ui/Badge';
import { formatMoney } from '../../../lib/money';
import { QuoteStatus, type Quote, type Vendor } from '../../../shared/schemas';
import { sourceForQuote } from '../vendorLogic';
import { QuoteForm } from './QuoteForm';

type Props = { vendor: Vendor; currency: string; onSave: (next: Vendor) => void };

type RowProps = { quote: Quote; index: number; onStatus: (status: QuoteStatus) => void };

function QuoteRow({ quote: q, index, onStatus }: RowProps) {
  const source = sourceForQuote(q);
  return (
    <li className="flex flex-wrap items-center gap-2">
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
        aria-label={`Status of quote ${index + 1}`}
        className="min-h-[44px] rounded border-2 border-line bg-bg px-2"
        value={q.status}
        onChange={(e) => onStatus(QuoteStatus.parse(e.target.value))}
      >
        {QuoteStatus.options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </li>
  );
}

/** The quote log. Logging or confirming a quote updates the matching budget line's badge. */
export function VendorQuotes({ vendor: v, currency, onSave }: Props) {
  const setStatus = (i: number, status: QuoteStatus) =>
    onSave({ ...v, quotes: v.quotes.map((q, n) => (n === i ? { ...q, status } : q)) });
  return (
    <section aria-label={`Quotes from ${v.name || v.type}`} className="space-y-2">
      <h3>Quotes</h3>
      {v.quotes.length === 0 ? (
        <p className="text-muted">
          No quotes logged. Cueline never assumes prices or availability.
        </p>
      ) : (
        <ul className="space-y-2">
          {v.quotes.map((q, i) => (
            <QuoteRow
              key={`${i}-${q.amount.amount}`}
              quote={q}
              index={i}
              onStatus={(s) => setStatus(i, s)}
            />
          ))}
        </ul>
      )}
      <QuoteForm
        idPrefix={`quote-${v.id}`}
        vendorName={v.name || v.type}
        currency={currency}
        onAdd={(q) => onSave({ ...v, quotes: [...v.quotes, q] })}
      />
    </section>
  );
}
