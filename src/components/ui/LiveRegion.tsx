import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Politeness = 'polite' | 'assertive';
type Announce = (message: string, politeness?: Politeness) => void;

const NBSP = String.fromCharCode(160);
const LiveRegionContext = createContext<Announce>(() => undefined);

/**
 * App-level screen-reader announcer: one polite and one assertive region.
 * Repeated identical messages are made distinct with a trailing NBSP so they are re-read.
 */
export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');

  const announce = useCallback<Announce>((message, politeness = 'polite') => {
    const set = politeness === 'assertive' ? setAssertive : setPolite;
    set((prev) => (prev === message ? message + NBSP : message));
  }, []);

  const value = useMemo(() => announce, [announce]);

  return (
    <LiveRegionContext.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="live-polite">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" data-testid="live-assertive">
        {assertive}
      </div>
    </LiveRegionContext.Provider>
  );
}

export const useAnnounce = (): Announce => useContext(LiveRegionContext);
