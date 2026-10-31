import { useState } from 'react';
import { FieldShell, inputClass } from '../../../components/ui/Field';
import type { GuestLine } from '../../../lib/pseudonymize';
import { parseCsvGuests } from '../guestImport';

type Props = { disabled: boolean; onLines: (lines: GuestLine[]) => void };

/** CSV upload, parsed in the browser; size and format problems are shown on the field. */
export function CsvUpload({ disabled, onLines }: Props) {
  const [fileError, setFileError] = useState<string>();
  const onFile = async (file: File | undefined) => {
    setFileError(undefined);
    if (!file) return;
    const parsed = parseCsvGuests(await file.text());
    if ('error' in parsed) return setFileError(parsed.error);
    if (parsed.length === 0) return setFileError('No guest names found in that file.');
    onLines(parsed);
  };
  return (
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
        disabled={disabled}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </FieldShell>
  );
}
