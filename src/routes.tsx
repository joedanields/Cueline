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
];

export const NotFoundScreen = lazy(() => import('./features/home/NotFoundScreen'));
