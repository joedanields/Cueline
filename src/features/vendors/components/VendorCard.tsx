import { useAnnounce } from '../../../components/ui/LiveRegion';
import type { Vendor } from '../../../shared/schemas';
import { useStore } from '../../../store';
import { lineForVendor } from '../vendorLogic';
import { VendorQuestions } from './VendorQuestions';
import { VendorQuotes } from './VendorQuotes';

/** One vendor: questions to ask (AI-suggested from guest needs) and the quote log. */
export function VendorCard({ vendor: v }: { vendor: Vendor }) {
  const currency = useStore((s) => s.event?.budget.currency ?? 'USD');
  const upsertVendor = useStore((s) => s.upsertVendor);
  const removeVendor = useStore((s) => s.removeVendor);
  const announce = useAnnounce();

  /** Save and keep the budget line's source badge in step with the quote log. */
  const save = (next: Vendor) => {
    upsertVendor(next);
    const line = lineForVendor(next, useStore.getState().budget);
    if (!line) return;
    useStore.getState().upsertBudgetLine(line);
    const label = line.source === 'confirmed' ? 'Confirmed' : 'a Quote';
    announce(`Budget line for ${next.name || next.type} is now ${label}.`);
  };

  return (
    <article aria-labelledby={`vendor-${v.id}`} className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`vendor-${v.id}`}>
          {v.name || 'Unnamed'} <span className="text-base font-normal text-muted">· {v.type}</span>
        </h2>
        <button
          type="button"
          className="min-h-[44px] text-danger underline"
          onClick={() => removeVendor(v.id)}
        >
          Remove<span className="sr-only"> {v.name}</span>
        </button>
      </div>
      <VendorQuestions vendor={v} onChange={upsertVendor} />
      <VendorQuotes vendor={v} currency={currency} onSave={save} />
    </article>
  );
}
