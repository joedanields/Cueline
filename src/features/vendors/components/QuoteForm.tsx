import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { SelectField, TextField } from '../../../components/ui/Field';
import { QuoteStatus, type Quote } from '../../../shared/schemas';
import { parseMajorToMinor } from '../../../lib/money';

/** Log a vendor quote. Amounts come only from the user — nothing is assumed. */
export function QuoteForm({
  idPrefix,
  vendorName,
  currency,
  onAdd,
}: {
  idPrefix: string;
  vendorName: string;
  currency: string;
  onAdd: (q: Quote) => void;
}) {
  const [amount, setAmount] = useState('');
  const [inclusions, setInclusions] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [status, setStatus] = useState<Quote['status']>('received');
  const [error, setError] = useState<string>();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      aria-label={`Log a quote from ${vendorName}`}
      onSubmit={(e) => {
        e.preventDefault();
        const minor = parseMajorToMinor(amount, currency);
        if (minor === undefined) return setError('Enter the quoted amount as a number.');
        onAdd({
          amount: { amount: minor, currency },
          inclusions: inclusions.slice(0, 500),
          validUntil: validUntil || undefined,
          status,
        });
        setAmount('');
        setInclusions('');
        setValidUntil('');
        setError(undefined);
      }}
    >
      <TextField
        id={`${idPrefix}-amount`}
        label={`Quoted amount (${currency})`}
        inputMode="decimal"
        value={amount}
        error={error}
        onChange={(e) => setAmount(e.target.value)}
      />
      <TextField
        id={`${idPrefix}-incl`}
        label="What’s included"
        maxLength={500}
        value={inclusions}
        onChange={(e) => setInclusions(e.target.value)}
      />
      <TextField
        id={`${idPrefix}-valid`}
        label="Valid until (optional)"
        type="date"
        value={validUntil}
        onChange={(e) => setValidUntil(e.target.value)}
      />
      <SelectField
        id={`${idPrefix}-status`}
        label="Status"
        value={status}
        onChange={(e) => setStatus(QuoteStatus.parse(e.target.value))}
      >
        {QuoteStatus.options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </SelectField>
      <div className="sm:col-span-2">
        <Button type="submit">Log quote</Button>
      </div>
    </form>
  );
}
