import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Page } from '../../components/ui/Page';
import { NeedsFirst } from '../../components/ui/NeedsFirst';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store';
import { sortByOffset } from '../../engine/runSheet';
import { PrintCueSheets, PrintHelperCards, PrintRunSheet } from './components/PrintViews';

const TITLES: Record<string, string> = {
  runsheet: 'Run sheet',
  cues: 'Cue sheets',
  cards: 'Helper cards',
};

/** Print-ready documents: full run sheet, cue sheets grouped by owner, or every helper card. */
export default function PrintScreen() {
  const { kind = 'runsheet' } = useParams();
  const event = useStore((s) => s.event);
  const runSheet = useStore((s) => s.runSheet);
  const helpers = useStore((s) => s.helpers);
  const segments = useMemo(
    () => sortByOffset((runSheet?.segments ?? []).filter((s) => s.status !== 'skipped')),
    [runSheet],
  );
  const owners = useMemo(() => [{ id: 'organizer', name: 'Organizer' }, ...helpers], [helpers]);
  const ownerName = (id?: string) => owners.find((o) => o.id === id)?.name ?? 'Unassigned';
  const title = TITLES[kind] ?? 'Print';

  if (!event || (!runSheet && kind !== 'cards')) {
    return (
      <NeedsFirst
        title={title}
        before="Nothing to print yet."
        to="/runsheet"
        link="Draft a run sheet"
      />
    );
  }
  const view = { segments, startsAt: event.startsAt };
  return (
    <Page
      title={title}
      heading={`${title} — ${event.title}`}
      actions={<Button onClick={() => window.print()}>Print</Button>}
    >
      {kind === 'runsheet' ? <PrintRunSheet {...view} ownerName={ownerName} /> : null}
      {kind === 'cues' ? <PrintCueSheets {...view} owners={owners} /> : null}
      {kind === 'cards' ? (
        <PrintHelperCards helpers={helpers} event={event} runSheet={runSheet} />
      ) : null}
    </Page>
  );
}
