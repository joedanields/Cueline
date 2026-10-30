import { Link } from 'react-router';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';
import { DeleteDataPanel } from './DeleteDataPanel';

const linkButton = 'inline-flex min-h-[44px] items-center rounded border-2 px-4 py-2 font-medium';

export default function HomeScreen() {
  const event = useStore((s) => s.event);
  const guestCount = useStore((s) => s.guests.length);
  const loadDemo = useStore((s) => s.loadDemo);
  const announce = useAnnounce();

  return (
    <Page
      title="Home"
      heading="Plan around your guests"
      intro="Cueline turns who's coming into quantities, seating, accessibility, prep tasks, helper cues and a live run sheet that re-plans itself when the day runs late."
    >
      <section aria-labelledby="start-heading" className="card space-y-3">
        <h2 id="start-heading">{event ? event.title : 'Get started'}</h2>
        {event ? (
          <p>
            {guestCount} guests on the list. Pick up where you left off from the navigation above.
          </p>
        ) : (
          <p>Answer a few questions about your celebration, or explore a ready-made example.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link to="/intake" className={`${linkButton} border-accent bg-accent text-accent-fg`}>
            {event ? 'Edit event details' : 'Start planning'}
          </Link>
          <Button
            onClick={() => {
              loadDemo();
              announce('Demo loaded: Grandpa’s 75th birthday lunch with 62 guests.');
            }}
          >
            Load demo: Grandpa’s 75th
          </Button>
        </div>
      </section>
      <DeleteDataPanel />
    </Page>
  );
}
