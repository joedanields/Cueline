import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactElement } from 'react';
import { App } from '../src/App';
import { LiveRegionProvider } from '../src/components/ui/LiveRegion';
import { resetPageFocusTracking } from '../src/components/ui/Page';

/** Render the full app shell at a given route, as on a fresh page load. */
export function renderApp(path = '/') {
  resetPageFocusTracking();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** Render a single screen with router + live region, without the shell. */
export function renderScreen(ui: ReactElement, path = '/') {
  resetPageFocusTracking();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LiveRegionProvider>{ui}</LiveRegionProvider>
    </MemoryRouter>,
  );
}
