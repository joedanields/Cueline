import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { FieldShell, TextAreaField, inputClass } from '../../../components/ui/Field';
import type { GuestLine } from '../../../lib/pseudonymize';
import { parseCsvGuests, parsePastedLines } from '../guestImport';
import { useGuestImport } from '../useGuestImport';

const PLACEHOLDER =
  'Grandpa — birthday boy, diabetic, uses a walker\nRaman family (4) — 2 kids under 6, vegetarian\nPriya, flying in from Delhi';

/** Paste or CSV → Guest Lens. Errors move focus to Retry; adding without AI is always possible. */
export function ImportPanel() {
  const { analyse, addWithoutAi, status, error, retry } = useGuestImport();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<GuestLine[]>([]);
  const [fileError, setFileError] = useState<string>();
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (status === 'error') retryRef.current?.focus();
  }, [status]);

  const run = async (lines: GuestLine[]) => {
    if (lines.length === 0) return;
    setPending(lines);
    if (await analyse(lines)) {
      setText('');
      setPending([]);
    }
  };

  const onFile = async (file: File | undefined) => {
    setFileError(undefined);
    if (!file) return;
    const parsed = parseCsvGuests(await file.text());
    if ('error' in parsed) return setFileError(parsed.error);
    if (parsed.length === 0) return setFileError('No guest names found in that file.');
    await run(parsed);
  };

  const busy = status === 'loading';
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
        <Button
          disabled={!text.trim() || busy}
          onClick={() => {
            addWithoutAi(parsePastedLines(text));
            setText('');
          }}
        >
          Add without AI
        </Button>
      </div>
      <FieldShell
        id="guest-csv"
        label="Or upload a CSV file (name column plus notes)"
        error={fileError}
      >
        <input
          id="guest-csv"
          type="file"
          accept=".csv,text/csv"
          className={inputClass}
          disabled={busy}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </FieldShell>
      <div aria-live="off" className="min-h-[3rem]">
        {busy ? (
          <p className="text-muted">
            Analysing {pending.length} lines… names are replaced with codes before sending.
          </p>
        ) : null}
        {status === 'error' && error ? (
          <div className="space-y-2 rounded border-2 border-danger p-3">
            <p>
              <span aria-hidden="true">⚠ </span>
              {error.message}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button ref={retryRef} onClick={() => void retry()}>
                Retry
              </Button>
              <Button
                onClick={() => {
                  addWithoutAi(pending);
                  setPending([]);
                  setText('');
                }}
              >
                Add {pending.length} guests without AI
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
