import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Page } from '../../components/ui/Page';
import { useStore } from '../../store';
import { selectNeedGroups } from '../../store/selectors';
import { lowConfidenceFields } from './guestImport';
import { ImportPanel } from './components/ImportPanel';
import { ManualAddForm } from './components/ManualAddForm';
import { NeedGroupChips } from './components/NeedGroupChips';
import { RsvpHeader } from './components/RsvpHeader';
import { GuestTable } from './components/GuestTable';

export default function GuestsScreen() {
  const guests = useStore((s) => s.guests);
  const groups = useStore(selectNeedGroups);
  const [filter, setFilter] = useState<string>();
  const [reviewOnly, setReviewOnly] = useState(false);

  const visible = useMemo(() => {
    const inGroup = filter ? new Set(groups.find((g) => g.key === filter)?.guestIds) : undefined;
    return guests.filter((g) => (!inGroup || inGroup.has(g.id)) && (!reviewOnly || lowConfidenceFields(g).length > 0));
  }, [filter, groups, guests, reviewOnly]);
  const toReview = useMemo(() => guests.filter((g) => lowConfidenceFields(g).length > 0).length, [guests]);
  const groupLabel = groups.find((g) => g.key === filter)?.label;

  return (
    <Page
      title="Guests"
      heading="Guest Lens"
      intro="Paste a messy guest list and Cueline finds the needs a form never captures. Every tag is editable."
    >
      <RsvpHeader />
      <ImportPanel />
      <ManualAddForm />
      <section aria-labelledby="groups-heading" className="space-y-3">
        <h2 id="groups-heading">Need groups</h2>
        <NeedGroupChips groups={groups} selected={filter} onSelect={setFilter} />
      </section>
      <section aria-labelledby="list-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="list-heading">
            Guest list ({visible.length}{visible.length !== guests.length ? ` of ${guests.length}` : ''})
          </h2>
          {toReview > 0 ? (
            <label className="flex min-h-[44px] items-center gap-2">
              <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} />
              Only show guests to check ({toReview})
            </label>
          ) : null}
        </div>
        {guests.length === 0 ? (
          <p className="card">
            No guests yet. Paste a list above, add one by hand, or <Link to="/" className="underline">load the demo</Link>.
          </p>
        ) : (
          <GuestTable guests={visible} caption={groupLabel ? `Guests in ${groupLabel}` : 'All guests'} />
        )}
      </section>
    </Page>
  );
}
