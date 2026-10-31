import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { TextAreaField } from '../../../components/ui/Field';
import type { GuestLine } from '../../../lib/pseudonymize';
import { parsePastedLines } from '../guestImport';
import { useGuestImport } from '../useGuestImport';
import { CsvUpload } from './CsvUpload';
import { ImportError } from './ImportError';

const PLACEHOLDER = [
  'Grandpa — birthday boy, diabetic, uses a walker',
  'Raman family (4) — 2 kids under 6, vegetarian',
  'Priya, flying in from Delhi',
].join('\n');

/** Paste or CSV → Guest Lens. Errors move focus to Retry; adding without AI is always possible. */
export function ImportPanel() {
  const { analyse, addWithoutAi, status, error, retry } = useGuestImport();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<GuestLine[]>([]);
  const busy = status === 'loading';
  const clear = () => {
    setText('');
    setPending([]);
  };
  const run = async (lines: GuestLine[]) => {
    if (lines.length === 0) return;
    setPending(lines);
    if (await analyse(lines)) clear();
  };
  const addPlain = (lines: GuestLine[]) => {
    addWithoutAi(lines);
    clear();
  };

  return (
    <section aria-labelledby="import-heading" className="card space-y-4">
      <h2 id="import-heading">Add guests</h2>
      <TextAreaField
        id="guest-paste"
        label="Paste your guest list — one guest or household per line"
        hint="Write needs in your own words. Names stay in this browser; please don't paste phone numbers or addresses."
        rows={6}
        value={text}
        placeholder={PLACEHOLDER}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          busy={busy}
          busyLabel="Analysing…"
          disabled={!text.trim()}
          onClick={() => void run(parsePastedLines(text))}
        >
          Analyse with AI
        </Button>
        <Button disabled={!text.trim() || busy} onClick={() => addPlain(parsePastedLines(text))}>
          Add without AI
        </Button>
      </div>
      <CsvUpload disabled={busy} onLines={(lines) => void run(lines)} />
      <div aria-live="off" className="min-h-[3rem]">
        {busy ? (
          <p className="text-muted">
            Analysing {pending.length} lines… names are replaced with codes before sending.
          </p>
        ) : null}
        {status === 'error' && error ? (
          <ImportError
            message={error.message}
            count={pending.length}
            onRetry={() => void retry()}
            onAddWithoutAi={() => addPlain(pending)}
          />
        ) : null}
      </div>
    </section>
  );
}
