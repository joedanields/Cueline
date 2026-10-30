import { useState } from 'react';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { VendorType } from '../../shared/schemas';
import { newId } from '../../lib/id';
import { useStore } from '../../store';
import { VendorCard } from './components/VendorCard';

export default function VendorsScreen() {
  const vendors = useStore((s) => s.vendors);
  const upsertVendor = useStore((s) => s.upsertVendor);
  const [type, setType] = useState<VendorType>('caterer');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  return (
    <Page title="Vendors" heading="Vendor checklist" intro="Questions driven by your guests' needs, and a log of the quotes you receive. Logging a quote updates the budget line's badge.">
      <form
        aria-labelledby="add-vendor-heading"
        className="card grid gap-3 sm:grid-cols-[12rem_1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          upsertVendor({ id: newId('v'), type, name: name.trim().slice(0, 80), contact: contact.trim().slice(0, 120) || undefined, questions: [], quotes: [] });
          setName('');
          setContact('');
        }}
      >
        <h2 id="add-vendor-heading" className="sm:col-span-4">Add a vendor</h2>
        <SelectField id="vendor-type" label="Type" value={type} onChange={(e) => setType(VendorType.parse(e.target.value))}>
          {VendorType.options.map((t) => <option key={t} value={t}>{t}</option>)}
        </SelectField>
        <TextField id="vendor-name" label="Name (optional)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <TextField id="vendor-contact" label="Contact (optional)" value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} />
        <Button type="submit">Add vendor</Button>
      </form>
      {vendors.length === 0 ? <p className="card">No vendors yet. Add the caterer, venue or baker you're talking to.</p> : null}
      {vendors.map((v) => <VendorCard key={v.id} vendor={v} />)}
    </Page>
  );
}
