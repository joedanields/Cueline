import { useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/Field';
import type { CelebrationEvent } from '../../../shared/schemas';
import type { IntakeField } from '../../../shared/aiTasks';
import { draftToEvent, type DraftErrors, type IntakeDraft } from '../intakeLogic';
import { FieldInput } from './FieldInput';

const SUMMARY_FIELDS: { field: IntakeField; label: string }[] = [
  { field: 'occasion', label: 'Occasion' },
  { field: 'startsAt', label: 'Starts' },
  { field: 'endsAt', label: 'Ends (optional — defaults to 4 hours)' },
  { field: 'venueType', label: 'Venue type' },
  { field: 'region', label: 'City or region (optional, used for context only)' },
  { field: 'culturalContext', label: 'Cultural or religious context (optional)' },
  { field: 'budget', label: 'Total budget' },
  { field: 'mealTypes', label: 'What you will serve' },
  { field: 'weights', label: 'Priorities' },
];

type Props = {
  draft: IntakeDraft;
  onChange: (patch: Partial<IntakeDraft>) => void;
  onConfirm: (event: CelebrationEvent) => void;
  onBack?: () => void;
};

/** Every answer in one editable form; confirming validates and saves the event. */
export function SummaryCard({ draft, onChange, onConfirm, onBack }: Props) {
  const [errors, setErrors] = useState<DraftErrors>({});
  const errorRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    const result = draftToEvent(draft);
    if (result.ok) return onConfirm(result.event);
    setErrors(result.errors);
    queueMicrotask(() => errorRef.current?.focus());
  };
  const errorList = Object.values(errors);

  return (
    <section aria-labelledby="summary-heading" className="card space-y-4">
      <h2 id="summary-heading">Check your event details</h2>
      <p className="text-muted">
        Change anything you like, then confirm. You can come back and edit later.
      </p>
      {errorList.length > 0 ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded border-2 border-danger p-3"
        >
          <p className="font-semibold">
            Please fix {errorList.length === 1 ? '1 field' : `${errorList.length} fields`}:
          </p>
          <ul className="list-disc pl-6">
            {errorList.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField
          id="sum-title"
          label="Event title (optional)"
          maxLength={80}
          value={draft.title}
          placeholder={draft.occasion}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        {SUMMARY_FIELDS.map(({ field, label }) => (
          <FieldInput
            key={field}
            field={field}
            label={label}
            draft={draft}
            onChange={onChange}
            errors={errors}
            idPrefix="sum"
          />
        ))}
        <div className="flex flex-wrap gap-2">
          {onBack ? <Button onClick={onBack}>Back to questions</Button> : null}
          <Button type="submit" variant="primary">
            Confirm event details
          </Button>
        </div>
      </form>
    </section>
  );
}
