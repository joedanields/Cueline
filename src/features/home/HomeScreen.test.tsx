import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../../../tests/axe';
import { renderApp } from '../../../tests/renderApp';
import { useStore } from '../../store';

describe('HomeScreen', () => {
  beforeEach(() => useStore.getState().deleteAllData());

  it('loads the demo and announces it', async () => {
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /load demo/i }));
    expect(useStore.getState().guests).toHaveLength(62);
    expect(screen.getByRole('heading', { level: 2, name: /grandpa’s 75th/i })).toBeVisible();
    expect(screen.getByTestId('live-polite')).toHaveTextContent(/demo loaded/i);
  });

  it('deletes all data only after keyboard confirmation, and cancel restores focus', async () => {
    useStore.getState().loadDemo();
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /delete all my data/i }));
    expect(screen.getByRole('button', { name: /yes, delete everything/i })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(useStore.getState().guests).toHaveLength(62);
    expect(screen.getByRole('button', { name: /delete all my data/i })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: /delete all my data/i }));
    await user.keyboard('{Enter}');
    expect(useStore.getState().guests).toHaveLength(0);
    expect(screen.getByTestId('live-polite')).toHaveTextContent(/deleted/i);
  });

  it('has no axe violations in empty and confirming states', async () => {
    const { container } = renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('button', { name: /delete all my data/i }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
