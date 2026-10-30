import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../../../tests/axe';
import { renderApp } from '../../../tests/renderApp';
import { useStore } from '../../store';
import { cacheClear } from '../../ai/cache';
import { mergeChecklist } from './useChecklist';

const openTab = async (name: RegExp) => {
  await userEvent.click(await screen.findByRole('tab', { name }));
  return screen.getByRole('tabpanel');
};

describe('PlanScreen', () => {
  beforeEach(() => {
    useStore.getState().deleteAllData();
    useStore.getState().loadDemo();
    cacheClear();
  });

  it('supports the WAI-ARIA tabs keyboard pattern', async () => {
    renderApp('/plan');
    const user = userEvent.setup();
    const first = await screen.findByRole('tab', { name: 'Quantities' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Menu coverage' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Menu coverage' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Budget' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Quantities' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}{Home}');
    expect(first).toHaveAttribute('tabindex', '0');
  });

  it('shows quantities with their basis, and an RSVP change updates them live', async () => {
    renderApp('/plan');
    const panel = await openTab(/quantities/i);
    const mainsRow = within(panel).getByRole('row', { name: /mains/i });
    const before = mainsRow.textContent;
    expect(mainsRow).toHaveTextContent(/adult-equivalents × 350 g/);
    useStore.getState().setRsvp(useStore.getState().guests.slice(0, 10).map((g) => g.id), 'no');
    expect(await within(panel).findByRole('row', { name: /mains/i })).not.toHaveTextContent(before ?? '');
  });

  it('lets the user override a quantity and return to the calculated value', async () => {
    renderApp('/plan');
    const user = userEvent.setup();
    const panel = await openTab(/quantities/i);
    await user.type(within(panel).getByLabelText(/your amount for dessert/i), '99');
    expect(within(panel).getByText('Manual')).toBeVisible();
    expect(useStore.getState().quantityOverrides.Dessert).toBe(99);
    await user.click(within(panel).getByRole('button', { name: /use calculated amount for dessert/i }));
    expect(useStore.getState().quantityOverrides.Dessert).toBeUndefined();
  });

  it('highlights the diabetic-friendly menu gap and closes it when a dish is added', async () => {
    renderApp('/plan');
    const user = userEvent.setup();
    const panel = await openTab(/menu coverage/i);
    expect(within(panel).getByRole('row', { name: /diabetic-friendly/i })).toHaveTextContent(/gap: add 1 more/i);
    await user.type(within(panel).getByLabelText('Dish name'), 'Grilled vegetables');
    await user.click(within(panel).getByRole('checkbox', { name: 'Diabetic-friendly' }));
    await user.click(within(panel).getByRole('button', { name: 'Add dish' }));
    expect(within(panel).getByRole('row', { name: /diabetic-friendly/i })).toHaveTextContent(/covered/i);
  });

  it('seats wheelchair users in the step-free zone', async () => {
    renderApp('/plan');
    const panel = await openTab(/seating/i);
    const zone = within(panel).getByRole('region', { name: /step-free zone/i });
    expect(zone).toHaveTextContent('Prakash Verma');
    expect(zone).toHaveTextContent('Raghav Iyer');
  });

  it('writes the checklist via AI only for engine triggers, and falls back to static wording', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { items: [
      { trigger: 'mobility:wheelchair', text: 'Ramp at side gate' }, { trigger: 'made:up', text: 'Invented trigger' },
    ] } }))));
    renderApp('/plan');
    const user = userEvent.setup();
    const panel = await openTab(/accessibility/i);
    await user.click(within(panel).getByRole('button', { name: /write checklist/i }));
    expect(await within(panel).findByText('Ramp at side gate')).toBeVisible();
    expect(within(panel).queryByText('Invented trigger')).toBeNull();
    await user.click(within(panel).getByRole('checkbox', { name: 'Ramp at side gate' }));
    expect(useStore.getState().checklist[0]?.done).toBe(true);

    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 502 })));
    cacheClear();
    await user.click(within(panel).getByRole('button', { name: /rewrite checklist/i }));
    expect(await within(panel).findByText(/standard wording was used/i)).toBeVisible();
    expect(useStore.getState().checklist.length).toBeGreaterThan(5);
  });

  it('keeps done ticks for unchanged items when the checklist is rewritten', () => {
    const merged = mergeChecklist({ items: [{ trigger: 'a', text: 'Same' }] }, ['a'], [{ id: 'x', trigger: 'a', text: 'Same', done: true }]);
    expect(merged[0]?.done).toBe(true);
  });

  it('shows budget totals with source badges, edits a line and re-splits estimates', async () => {
    renderApp('/plan');
    const user = userEvent.setup();
    const panel = await openTab(/budget/i);
    expect(within(panel).getAllByText('Confirmed').length).toBeGreaterThan(0);
    expect(within(panel).getAllByText('Estimate').length).toBeGreaterThan(0);
    const amount = within(panel).getByLabelText('Amount for Contingency');
    await user.clear(amount);
    await user.type(amount, '7000');
    await user.tab();
    expect(useStore.getState().budget.find((l) => l.id === 'b_misc')?.amount.amount).toBe(700_000);
    await user.click(within(panel).getByRole('button', { name: /re-split estimates/i }));
    const lines = useStore.getState().budget;
    expect(lines.find((l) => l.id === 'b_venue')?.source).toBe('confirmed');
    expect(lines.some((l) => l.id.startsWith('b_est_'))).toBe(true);
  });

  it('has no axe violations on any tab', async () => {
    const { container } = renderApp('/plan');
    for (const name of [/quantities/i, /menu coverage/i, /seating/i, /accessibility/i, /budget/i]) {
      await openTab(name);
      expect(await axe(container)).toHaveNoViolations();
    }
  });
});
