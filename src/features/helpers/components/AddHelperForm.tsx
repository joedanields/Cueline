import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/Field';
import { useAnnounce } from '../../../components/ui/LiveRegion';
import { useStore } from '../../../store';
import { EMPTY_HELPER_FORM, helperFromForm, type HelperForm } from '../helperLogic';

/** Add a volunteer. Availability is optional and only what the organizer enters. */
export function AddHelperForm() {
  const upsertHelper = useStore((s) => s.upsertHelper);
  const announce = useAnnounce();
  const [form, setForm] = useState<HelperForm>(EMPTY_HELPER_FORM);
  const [error, setError] = useState<string>();
  const field = (key: keyof HelperForm) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const submit = () => {
    const result = helperFromForm(form);
    if (!result.ok) return setError(result.error);
    upsertHelper(result.helper);
    announce(`Added helper ${result.helper.name}.`);
    setForm(EMPTY_HELPER_FORM);
    setError(undefined);
  };

  return (
    <form
      aria-labelledby="add-helper-heading"
      className="card grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 id="add-helper-heading" className="sm:col-span-2">
        Add a helper
      </h2>
      <TextField id="helper-name" label="Name" maxLength={60} error={error} {...field('name')} />
      <TextField
        id="helper-phone"
        label="Phone (optional, stays in this browser)"
        type="tel"
        maxLength={20}
        {...field('phone')}
      />
      <TextField
        id="helper-from"
        label="Available from (optional)"
        type="datetime-local"
        {...field('from')}
      />
      <TextField
        id="helper-to"
        label="Available until (optional)"
        type="datetime-local"
        {...field('to')}
      />
      <div className="sm:col-span-2">
        <Button type="submit">Add helper</Button>
      </div>
    </form>
  );
}
