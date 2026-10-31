import { encodeHelperCard, type HelperCardData } from '../../../lib/urlState';
import { HelperCard } from './HelperCard';

type Props = { card: HelperCardData; helperId: string; name: string };

/** The cue card plus a read-only link; the card lives in the URL fragment, never on a server. */
export function ShareCard({ card, helperId, name }: Props) {
  const path = `/card#${encodeHelperCard(card)}`;
  return (
    <div className="space-y-2">
      <HelperCard card={card} />
      <label className="block text-sm" htmlFor={`share-${helperId}`}>
        Read-only share link (contains only {name}’s card; nothing is stored on a server)
      </label>
      <input
        id={`share-${helperId}`}
        readOnly
        value={`${window.location.origin}${path}`}
        className="min-h-[44px] w-full rounded border-2 border-line bg-bg px-2 text-sm"
        onFocus={(e) => e.target.select()}
      />
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center underline"
      >
        Open printable card<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}
