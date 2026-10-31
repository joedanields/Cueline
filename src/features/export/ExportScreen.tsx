import { Link } from 'react-router';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';
import { selectSchedule } from '../../store/selectors';
import { buildIcs } from '../../engine/ics';
import { downloadText } from '../../lib/download';
import { InvitesPanel } from './components/InvitesPanel';
import { guestCsv } from './guestCsv';

const linkClass =
  'inline-flex min-h-[44px] items-center rounded border-2 border-line px-4 underline';

export default function ExportScreen() {
  const event = useStore((s) => s.event);
  const guests = useStore((s) => s.guests);
  const taskCount = useStore((s) => s.tasks.length);
  const schedule = useStore(selectSchedule);
  const announce = useAnnounce();

  const ics = () => {
    if (!event || !schedule?.ok) return;
    downloadText(
      'cueline-deadlines.ics',
      buildIcs(event, schedule.tasks, new Date()),
      'text/calendar',
    );
    announce('Calendar file with prep deadlines downloaded.');
  };
  const csv = () => {
    downloadText('cueline-guests.csv', guestCsv(guests), 'text/csv');
    announce('Guest list downloaded.');
  };

  return (
    <Page
      title="Export"
      heading="Messages & export"
      intro="Everything you need on paper or in your calendar. Files are created in your browser — nothing is uploaded."
    >
      {event ? (
        <InvitesPanel />
      ) : (
        <p className="card">
          Add{' '}
          <Link to="/intake" className="underline">
            event details
          </Link>{' '}
          to write invitations.
        </p>
      )}
      <section aria-labelledby="print-heading" className="card space-y-3">
        <h2 id="print-heading">Print</h2>
        <p className="text-muted">
          Black on white, large type. Use your browser’s print dialog (or “Save as PDF”).
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className={linkClass} to="/print/runsheet">
            Printable run sheet
          </Link>
          <Link className={linkClass} to="/print/cues">
            Printable cue sheets (per person)
          </Link>
          <Link className={linkClass} to="/print/cards">
            Printable helper cards
          </Link>
        </div>
      </section>
      <section aria-labelledby="files-heading" className="card space-y-3">
        <h2 id="files-heading">Files</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={ics} disabled={!schedule?.ok || taskCount === 0}>
            Download prep deadlines (.ics)
          </Button>
          <Button onClick={csv} disabled={guests.length === 0}>
            Download guest list (.csv)
          </Button>
        </div>
      </section>
    </Page>
  );
}
