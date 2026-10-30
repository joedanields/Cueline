import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { SelectField, TextField } from '../../../components/ui/Field';
import { useAnnounce } from '../../../components/ui/LiveRegion';
import { AgeBand, Rsvp } from '../../../shared/schemas';
import { newId } from '../../../lib/id';
import { useStore } from '../../../store';

/** Add one guest by hand — all tags are set by the organizer, so nothing needs review. */
export function ManualAddForm() {
  const addGuests = useStore((s) => s.addGuests);
  const announce = useAnnounce();
  const [name, setName] = useState('');
  const [ageBand, setAgeBand] = useState<AgeBand>('adult');
  const [rsvp, setRsvp] = useState<Rsvp>('invited');
  const [error, setError] = useState<string>();

  return (
    <form
      aria-labelledby="manual-heading"
      className="card grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return setError('Enter a name.');
        addGuests([{ id: newId('g'), name: name.trim().slice(0, 80), ageBand, dietary: [], mobility: 'none', sensory: 'none',
          travel: 'local', role: 'guest', rsvp, confidence: {}, reviewed: true }]);
        announce(`Added ${name.trim()}.`);
        setName('');
        setError(undefined);
      }}
    >
      <h2 id="manual-heading" className="sm:col-span-4">Add one guest</h2>
      <TextField id="manual-name" label="Name" value={name} maxLength={80} error={error} autoComplete="off" onChange={(e) => setName(e.target.value)} />
      <SelectField id="manual-age" label="Age band" value={ageBand} onChange={(e) => setAgeBand(AgeBand.parse(e.target.value))}>
        {AgeBand.options.map((a) => <option key={a} value={a}>{a}</option>)}
      </SelectField>
      <SelectField id="manual-rsvp" label="RSVP" value={rsvp} onChange={(e) => setRsvp(Rsvp.parse(e.target.value))}>
        {Rsvp.options.map((r) => <option key={r} value={r}>{r}</option>)}
      </SelectField>
      <Button type="submit">Add guest</Button>
    </form>
  );
}
