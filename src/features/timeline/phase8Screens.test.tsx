import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../../../tests/axe';
import { renderApp } from '../../../tests/renderApp';
import { useStore } from '../../store';
import { cacheClear } from '../../ai/cache';
import { AI_OUTPUTS } from '../../../tests/fixtures/ai';
import { encodeHelperCard } from '../../lib/urlState';

const respond = (data: unknown) =>
  vi.fn(async (_u: string, _init?: RequestInit) => new Response(JSON.stringify({ data })));

describe('Timeline', () => {
  beforeEach(() => {
    useStore.getState().deleteAllData();
    useStore.getState().loadDemo();
    cacheClear();
  });

  it('marking a task done updates Do next and announces it', async () => {
    renderApp('/timeline');
    const user = userEvent.setup();
    const doNext = await screen.findByRole('region', { name: 'Do next' });
    const firstTitle =
      within(doNext).getAllByRole('listitem')[0]?.querySelector('strong')?.textContent ?? '';
    const button = screen
      .getAllByRole('button', { name: /mark done/i })
      .find((b) => b.textContent === `Mark done: ${firstTitle}`);
    if (!button) throw new Error('button missing');
    await user.click(button);
    expect(
      within(screen.getByRole('region', { name: 'Do next' })).queryByText(firstTitle),
    ).toBeNull();
    expect(screen.getByTestId('live-polite')).toHaveTextContent(`${firstTitle} marked done`);
  });

  it('slipping a task marks it and its dependents at risk', async () => {
    renderApp('/timeline');
    const user = userEvent.setup();
    const rsvp = (await screen.findAllByRole('listitem')).find((li) =>
      within(li).queryByRole('heading', { name: 'Chase RSVPs' }),
    );
    if (!rsvp) throw new Error('task missing');
    await user.selectOptions(within(rsvp).getByRole('combobox', { name: /slip by/i }), '7');
    const caterer = screen
      .getByRole('heading', { name: /finalise menu/i })
      .closest('li') as HTMLElement;
    expect(within(caterer).getByText('At risk')).toBeVisible();
    expect(useStore.getState().tasks.find((t) => t.id === 't_rsvp')).toMatchObject({
      status: 'slipped',
      slipDays: 7,
    });
  });

  it('drafts tasks with the AI (anonymous counts only) and falls back when it fails', async () => {
    const fetchMock = respond(AI_OUTPUTS.prepTasks);
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/timeline');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /redraft tasks/i }));
    expect(await screen.findByRole('heading', { name: 'Confirm step-free entry' })).toBeVisible();
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).not.toMatch(/Sharma|Verma/);
    expect(useStore.getState().versions[0]?.reason).toBe('Before drafting prep tasks');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 502 })),
    );
    const current = useStore.getState().event;
    if (current) useStore.getState().setEvent({ ...current, occasion: 'Reunion' }); // new input → no cache hit
    await user.click(screen.getByRole('button', { name: /redraft tasks/i }));
    expect(await screen.findByText(/standard task list was used/i)).toBeVisible();
    expect(useStore.getState().tasks.some((t) => t.needTrigger === 'mobility:wheelchair')).toBe(
      true,
    );
  });

  it('asks for event details first, and has no axe violations', async () => {
    const { container } = renderApp('/timeline');
    await screen.findByRole('region', { name: 'Do next' });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Vendors', () => {
  beforeEach(() => {
    useStore.getState().deleteAllData();
    useStore.getState().loadDemo();
    cacheClear();
  });

  it('suggests need-driven questions and logging a quote flips the budget line', async () => {
    vi.stubGlobal('fetch', respond(AI_OUTPUTS.vendorQuestions));
    renderApp('/vendors');
    const user = userEvent.setup();
    const caterer = await screen.findByRole('article', { name: /annapurna caterers/i });
    await user.click(within(caterer).getByRole('button', { name: /suggest questions/i }));
    expect(await within(caterer).findByText(/3 diabetic-friendly dessert portions/)).toBeVisible();
    await user.type(within(caterer).getByLabelText(/quoted amount/i), '60000');
    await user.click(within(caterer).getByRole('button', { name: 'Log quote' }));
    expect(useStore.getState().budget.find((l) => l.vendorId === 'v_caterer')).toMatchObject({
      source: 'quote',
      amount: { amount: 6_000_000 },
    });
    await user.selectOptions(
      within(caterer).getByRole('combobox', { name: 'Status of quote 1' }),
      'accepted',
    );
    expect(useStore.getState().budget.find((l) => l.vendorId === 'v_caterer')?.source).toBe(
      'confirmed',
    );
    expect(screen.getByTestId('live-polite')).toHaveTextContent(/now Confirmed/);
  });

  it('adds and removes vendors, with no axe violations', async () => {
    const { container } = renderApp('/vendors');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Type'), 'decorator');
    await user.type(screen.getByLabelText('Name (optional)'), 'Bloom');
    await user.click(screen.getByRole('button', { name: 'Add vendor' }));
    expect(screen.getByRole('article', { name: /bloom/i })).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Remove Bloom' }));
    expect(useStore.getState().vendors).toHaveLength(3);
  });
});

describe('Helpers', () => {
  beforeEach(() => {
    useStore.getState().deleteAllData();
    useStore.getState().loadDemo();
    cacheClear();
  });

  it('writes a brief for "Helper A" and restores the real name locally', async () => {
    const fetchMock = respond({ brief: 'Helper A, you run the cake. Arrive by 11:30.' });
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/helpers');
    const user = userEvent.setup();
    const priya = await screen.findByRole('article', { name: 'Priya' });
    await user.click(within(priya).getByRole('button', { name: 'Write brief' }));
    expect(
      await within(priya).findByDisplayValue('Priya, you run the cake. Arrive by 11:30.'),
    ).toBeVisible();
    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(body).toContain('Helper A');
    expect(body).not.toContain('Priya');
  });

  it('shows the cue card with a share link, and adds a helper', async () => {
    const { container } = renderApp('/helpers');
    const user = userEvent.setup();
    const arjun = await screen.findByRole('article', { name: 'Arjun' });
    await user.click(within(arjun).getByRole('button', { name: 'Show cue card' }));
    expect(within(arjun).getByRole('article', { name: /cue card for arjun/i })).toHaveTextContent(
      'Welcome and seating',
    );
    expect((within(arjun).getByLabelText(/share link/i) as HTMLInputElement).value).toMatch(
      /\/card#[A-Za-z0-9_-]+$/,
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.type(screen.getByLabelText('Name'), 'Zoya{Enter}');
    expect(useStore.getState().helpers.at(-1)?.name).toBe('Zoya');
  });

  it('opens a valid share link read-only and rejects a broken one', async () => {
    const card = {
      v: 1 as const,
      name: 'Meera',
      event: { title: 'Party', startsAt: '2030-06-01T12:00:00Z', venueType: 'hall' as const },
      tasks: [],
      segments: [{ time: '13:00', title: 'Lunch', cue: 'Serve seniors first' }],
    };
    const { container, unmount } = renderApp(`/card#${encodeHelperCard(card)}`);
    expect(
      await screen.findByRole('heading', { level: 1, name: /meera’s cue card/i }),
    ).toBeVisible();
    expect(screen.getByText(/serve seniors first/i)).toBeVisible();
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    renderApp('/card#garbage');
    expect(await screen.findByRole('heading', { level: 1, name: /doesn’t work/i })).toBeVisible();
  });
});
