import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../tests/axe';
import { renderApp } from '../tests/renderApp';

describe('App shell', () => {
  it('renders landmarks and the home heading', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: /plan around your guests/i }),
    ).toBeVisible();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(document.title).toBe('Home · Cueline');
  });

  it('puts the skip link first in tab order', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await userEvent.tab();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveFocus();
  });

  it('shows a not-found page for unknown routes', async () => {
    renderApp('/nope');
    expect(await screen.findByRole('heading', { level: 1, name: /page not found/i })).toBeVisible();
  });

  it('has no axe violations', async () => {
    const { container } = renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    expect(await axe(container)).toHaveNoViolations();
  });
});
