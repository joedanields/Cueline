import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../../../tests/axe';
import { renderApp } from '../../../tests/renderApp';
import { useStore } from '../../store';
import { cacheClear } from '../../ai/cache';
import { validEvent } from '../../../tests/fixtures/state';

type Body = { input: { asked: string[] } };
const QUESTIONS = [
  { done: false, field: 'occasion', question: 'What are you celebrating?', inputType: 'text', why: 'Shapes everything.' },
  { done: false, field: 'venueType', question: 'Where will it be held?', inputType: 'single_choice', options: ['Home'], why: 'Seating.' },
  { done: true },
];

function mockAi() {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const asked = (JSON.parse(String(init.body)) as Body).input.asked.length;
    return new Response(JSON.stringify({ data: QUESTIONS[Math.min(asked, QUESTIONS.length - 1)] }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('IntakeScreen', () => {
  beforeEach(() => {
    useStore.getState().deleteAllData();
    cacheClear();
  });

  it('asks one question at a time; answering shows the next one, and Back returns', async () => {
    mockAi();
    renderApp('/intake');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('What are you celebrating?'), 'Birthday');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('group', { name: 'Where will it be held?' })).toBeVisible();
    expect(screen.getByRole('heading', { name: /question 2/i })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText('What are you celebrating?')).toHaveValue('Birthday');
  });

  it('skips a question and reaches the summary when the AI is done', async () => {
    mockAi();
    renderApp('/intake');
    const user = userEvent.setup();
    await screen.findByLabelText('What are you celebrating?');
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await screen.findByRole('group', { name: 'Where will it be held?' });
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    // AI says done, but unanswered required fields remain → static questions fill the gaps
    // (fields the user skipped are not asked again).
    expect(await screen.findByLabelText('When does it start?')).toBeVisible();
  });

  it('falls back to static questions when the AI fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"upstream"}', { status: 502 })));
    renderApp('/intake');
    expect(await screen.findByText(/standard questions/i)).toBeVisible();
    expect(screen.getByLabelText('What are you celebrating?')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(await screen.findByLabelText('When does it start?')).toBeVisible();
  });

  it('confirms the summary with the keyboard, saving the event and estimate budget lines', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 502 })));
    renderApp('/intake');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /skip to the summary/i }));
    const summary = await screen.findByRole('region', { name: /check your event details/i });
    await user.click(within(summary).getByRole('button', { name: /confirm/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/please fix 5 fields/i);

    await user.type(within(summary).getByLabelText('Occasion'), 'Reunion');
    await user.type(within(summary).getByLabelText('Starts'), '2030-06-01T12:00');
    await user.click(within(summary).getByRole('radio', { name: 'Hall' }));
    await user.type(within(summary).getByLabelText('Total budget'), '50000');
    await user.click(within(summary).getByRole('checkbox', { name: 'Lunch' }));
    within(summary).getByRole('button', { name: /confirm/i }).focus();
    await user.keyboard('{Enter}');

    const { event, budget, versions } = useStore.getState();
    expect(event).toMatchObject({ occasion: 'Reunion', venueType: 'hall', mealTypes: ['lunch'] });
    expect(budget.length).toBeGreaterThan(0);
    expect(budget.every((l) => l.source === 'estimate')).toBe(true);
    expect(versions[0]?.reason).toMatch(/confirmed/i);
  });

  it('opens straight to an editable summary when an event exists', async () => {
    useStore.getState().setEvent(validEvent);
    const fetchMock = mockAi();
    renderApp('/intake');
    expect(await screen.findByRole('heading', { level: 1, name: /edit event details/i })).toBeVisible();
    expect(screen.getByLabelText('Occasion')).toHaveValue('Birthday');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('has no axe violations in question and summary states', async () => {
    mockAi();
    const { container } = renderApp('/intake');
    await screen.findByLabelText('What are you celebrating?');
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByRole('button', { name: /skip to the summary/i }));
    await screen.findByRole('region', { name: /check your event details/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});
