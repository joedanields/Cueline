import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../../../tests/axe';
import { renderApp } from '../../../tests/renderApp';
import { useStore } from '../../store';
import { cacheClear } from '../../ai/cache';
import { AI_OUTPUTS } from '../../../tests/fixtures/ai';

const PASTE = 'Grandpa — birthday boy, diabetic, uses walker\nRaman family (4) — 2 kids under 6, veg';

describe('GuestsScreen', () => {
  beforeEach(() => {
    useStore.getState().deleteAllData();
    cacheClear();
  });

  it('paste → loading announced → need groups render → fix a low-confidence tag', async () => {
    let resolve: (r: Response) => void = () => undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((r) => { resolve = r; }));
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/guests');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/paste your guest list/i), PASTE);
    await user.click(screen.getByRole('button', { name: /analyse with ai/i }));
    expect(screen.getByTestId('live-polite')).toHaveTextContent('Analysing guest list…');
    const sent = String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    expect(sent).not.toMatch(/Raman/);
    resolve(new Response(JSON.stringify({ data: AI_OUTPUTS.guestLens })));

    expect(await screen.findByRole('button', { name: /seniors · 1/i })).toBeVisible();
    expect(screen.getByTestId('live-polite')).toHaveTextContent(/added 3 guests\. found \d+ need groups, \d+ tags need your review/i);
    expect(useStore.getState().versions[0]?.reason).toBe('Imported 3 guests');
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('Check this').length).toBeGreaterThan(0);
    await user.click(within(table).getByRole('button', { name: /looks right for grandpa/i }));
    expect(useStore.getState().guests[0]?.reviewed).toBe(true);
  });

  it('offers Retry (focused) and Add without AI when Guest Lens fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"upstream"}', { status: 502 })));
    renderApp('/guests');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/paste your guest list/i), PASTE);
    await user.click(screen.getByRole('button', { name: /analyse with ai/i }));
    expect(await screen.findByRole('button', { name: 'Retry' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: /add 2 guests without ai/i }));
    expect(useStore.getState().guests).toHaveLength(2);
  });

  it('RSVP change updates the expected headcount and logs what changed in the plan', async () => {
    useStore.getState().loadDemo();
    renderApp('/guests');
    const user = userEvent.setup();
    const select = await screen.findByRole('combobox', { name: 'RSVP for Kamala Sharma' });
    await user.selectOptions(select, 'no');
    expect(screen.getByText(/last change:/i).parentElement).toHaveTextContent(/Kamala Sharma: no\. −1 expected → −0\.3 kg mains, food budget −₹900/);
    expect(useStore.getState().changeLog[0]?.text).toMatch(/−1 expected/);
  });

  it('filters by need group, edits tags, adds and removes guests by keyboard', async () => {
    useStore.getState().loadDemo();
    renderApp('/guests');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /wheelchair users · 2/i }));
    expect(screen.getByRole('heading', { name: /guest list \(2 of 62\)/i })).toBeVisible();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Mobility for Prakash Verma' }), 'limited_walking');
    expect(useStore.getState().guests.find((g) => g.name === 'Prakash Verma')?.mobility).toBe('limited_walking');
    await user.click(screen.getByRole('button', { name: /edit diet for raghav iyer/i }));
    await user.click(screen.getByRole('checkbox', { name: 'Halal' }));
    expect(useStore.getState().guests.find((g) => g.name === 'Raghav Iyer')?.dietary).toContain('halal');
    await user.click(screen.getByRole('button', { name: /remove raghav iyer/i }));
    expect(useStore.getState().guests).toHaveLength(61);

    await user.type(screen.getByLabelText('Name'), 'New Cousin{Enter}');
    expect(useStore.getState().guests.at(-1)?.name).toBe('New Cousin');
  });

  it('has no axe violations empty and with the demo loaded', async () => {
    const { container, unmount } = renderApp('/guests');
    await screen.findByRole('heading', { level: 1 });
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    useStore.getState().loadDemo();
    const loaded = renderApp('/guests');
    await screen.findByRole('table');
    expect(await axe(loaded.container)).toHaveNoViolations();
  });
});
