import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Toaster } from './Toaster';
import { useToastStore } from '../../store/toastStore';
import { axe } from '../../../tests/axe';

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error('render failed');
  return <p>Fine now</p>;
}

function Harness() {
  const [explode, setExplode] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setExplode(false)}>
        Fix it
      </button>
      <ErrorBoundary resetKey="/a">
        <Boom explode={explode} />
      </ErrorBoundary>
    </>
  );
}

describe('ErrorBoundary', () => {
  it('shows a recoverable message instead of a white screen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs caught errors
    render(<Harness />);
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    await userEvent.click(screen.getByRole('button', { name: 'Fix it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Fine now')).toBeVisible();
  });

  it('resets when the route changes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeVisible();
    rerender(
      <ErrorBoundary resetKey="/b">
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Fine now')).toBeVisible();
  });
});

describe('Toaster', () => {
  it('shows toasts as status messages until dismissed', async () => {
    const { container } = render(<Toaster />);
    act(() => useToastStore.getState().pushToast('Saved plan was reset', 'warning'));
    expect(screen.getByRole('status')).toHaveTextContent('Notice: Saved plan was reset');
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/saved plan was reset/i)).toBeNull();
  });
});
