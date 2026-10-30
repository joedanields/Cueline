import { Suspense } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router';
import { SkipLink } from './components/ui/SkipLink';
import { LiveRegionProvider } from './components/ui/LiveRegion';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Toaster } from './components/ui/Toaster';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { useGlobalShortcuts } from './lib/useShortcuts';
import { useUiStore } from './store/uiStore';
import { NotFoundScreen, ROUTES } from './routes';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-[44px] items-center rounded px-3 py-2 hover:underline ${
    isActive ? 'bg-accent text-accent-fg' : ''
  }`;

function Loading() {
  return (
    <p role="status" className="text-muted">
      Loading…
    </p>
  );
}

export function App() {
  const location = useLocation();
  const openShortcuts = useUiStore((st) => st.setShortcutsOpen);
  useGlobalShortcuts();
  return (
    <LiveRegionProvider>
      <SkipLink />
      <header className="border-b border-line/40 no-print">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <p className="text-lg font-bold">
            Cueline <span className="text-sm font-normal text-muted">Guests in. Cues out.</span>
          </p>
          <nav aria-label="Primary">
            <ul className="flex flex-wrap gap-1">
              {ROUTES.filter((r) => r.inNav).map((r) => (
                <li key={r.path}>
                  <NavLink to={r.path} end={r.path === '/'} className={navLinkClass}>
                    {r.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 focus:outline-none">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<Loading />}>
            <Routes>
              {ROUTES.map(({ path, Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
              <Route path="*" element={<NotFoundScreen />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="border-t border-line/40 no-print">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted">
          Your plan stays in this browser. Guest names are never sent to the AI.{' '}
          <button type="button" className="min-h-[24px] underline" onClick={() => openShortcuts(true)}>
            Keyboard shortcuts (?)
          </button>
        </div>
      </footer>
      <Toaster />
      <ShortcutsDialog />
    </LiveRegionProvider>
  );
}
