import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export type AppRoute = {
  path: string;
  label: string;
  Component: LazyExoticComponent<ComponentType>;
  /** Shown in the primary navigation. */
  inNav: boolean;
};

export const ROUTES: AppRoute[] = [
  { path: '/', label: 'Home', inNav: true, Component: lazy(() => import('./features/home/HomeScreen')) },
  { path: '/intake', label: 'Event', inNav: true, Component: lazy(() => import('./features/intake/IntakeScreen')) },
  { path: '/guests', label: 'Guests', inNav: true, Component: lazy(() => import('./features/guests/GuestsScreen')) },
  { path: '/plan', label: 'Plan', inNav: true, Component: lazy(() => import('./features/plan/PlanScreen')) },
  { path: '/timeline', label: 'Timeline', inNav: true, Component: lazy(() => import('./features/timeline/TimelineScreen')) },
  { path: '/vendors', label: 'Vendors', inNav: true, Component: lazy(() => import('./features/vendors/VendorsScreen')) },
  { path: '/helpers', label: 'Helpers', inNav: true, Component: lazy(() => import('./features/helpers/HelpersScreen')) },
  { path: '/runsheet', label: 'Run sheet', inNav: true, Component: lazy(() => import('./features/runsheet/RunSheetScreen')) },
  // Live mode is its own chunk so the planning screens never load it.
  { path: '/live', label: 'Live', inNav: true, Component: lazy(() => import('./features/live/LiveScreen')) },
  { path: '/card', label: 'Cue card', inNav: false, Component: lazy(() => import('./features/helpers/HelperCardScreen')) },
];

export const NotFoundScreen = lazy(() => import('./features/home/NotFoundScreen'));
