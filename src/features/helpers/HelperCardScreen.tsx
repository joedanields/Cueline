import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { Button } from '../../components/ui/Button';
import { decodeHelperCard } from '../../lib/urlState';
import { HelperCard } from './components/HelperCard';

/** Read-only helper card from a share link. The fragment is validated with zod before rendering. */
export default function HelperCardScreen() {
  const { hash } = useLocation();
  const card = useMemo(() => decodeHelperCard(hash), [hash]);

  useEffect(() => {
    document.title = card ? `${card.name}’s cue card · Cueline` : 'Cue card · Cueline';
  }, [card]);

  if (!card) {
    return (
      <div className="card space-y-2">
        <h1>This cue card link doesn’t work</h1>
        <p>It may have been cut off when it was copied. Ask the organizer to send it again.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <HelperCard card={card} headingLevel={1} />
      <Button className="no-print" onClick={() => window.print()}>Print this card</Button>
    </div>
  );
}
