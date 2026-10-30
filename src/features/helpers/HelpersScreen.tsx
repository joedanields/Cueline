import { useState } from 'react';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { newId } from '../../lib/id';
import { useStore } from '../../store';
import { HelperPanel } from './components/HelperPanel';

const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined);

export default function HelpersScreen() {
  const helpers = useStore((s) => s.helpers);
  const upsertHelper = useStore((s) => s.upsertHelper);
  const announce = useAnnounce();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string>();

  return (
    <Page title="Helpers" heading="Helper roster" intro="Volunteers get a short brief and a cue card with only their own jobs. Cueline never claims anyone is available — only what you enter.">
      <form
        aria-labelledby="add-helper-heading"
        className="card grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return setError('Enter a name.');
          if (from && to && to <= from) return setError('Availability must end after it starts.');
          upsertHelper({ id: newId('h'), name: name.trim().slice(0, 60), phone: phone.trim().slice(0, 20) || undefined, availableFrom: toIso(from), availableTo: toIso(to) });
          announce(`Added helper ${name.trim()}.`);
          setName('');
          setPhone('');
          setFrom('');
          setTo('');
          setError(undefined);
        }}
      >
        <h2 id="add-helper-heading" className="sm:col-span-2">Add a helper</h2>
        <TextField id="helper-name" label="Name" value={name} maxLength={60} error={error} onChange={(e) => setName(e.target.value)} />
        <TextField id="helper-phone" label="Phone (optional, stays in this browser)" type="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} />
        <TextField id="helper-from" label="Available from (optional)" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField id="helper-to" label="Available until (optional)" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="sm:col-span-2"><Button type="submit">Add helper</Button></div>
      </form>
      {helpers.length === 0 ? <p className="card">No helpers yet. Add the friends and family who are pitching in.</p> : null}
      {helpers.map((h, i) => <HelperPanel key={h.id} helper={h} index={i} />)}
    </Page>
  );
}
