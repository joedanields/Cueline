import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../../../tests/axe';
import { renderApp } from '../../../tests/renderApp';
import { useStore } from '../../store';
import { cacheClear } from '../../ai/cache';
import { AI_OUTPUTS } from '../../../tests/fixtures/ai';
import type { AiOutput } from '../../shared/aiTasks';
import {
  fallbackRunSheet,
  moveSegment,
  runSheetFromDraft,
  setDuration,
} from '../runsheet/runSheetDraft';
import { breakAnnouncement, describeBreak, recoveryInput } from './liveLogic';
import { makeConstraint, makeSegment } from '../../../tests/fixtures/state';

const json = (data: unknown) =>
  vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify({ data })));
/** Rehearsal clock to minute 40 (during the toast), as in the demo script. */
const setClock = (minutes: number) => {
  const slider = screen.getByLabelText(/rehearsal clock/i);
  slider.focus();
  // Native range: set value directly, then let React see the change.
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
    slider,
    String(minutes),
  );
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('run sheet logic', () => {
  it('maps AI helper labels back to ids and drops dangling constraints', () => {
    const out = AI_OUTPUTS.runSheet as AiOutput<'runSheet'>;
    const sheet = runSheetFromDraft(
      {
        ...out,
        constraints: [
          ...out.constraints,
          {
            ...(out.constraints[0] as AiOutput<'runSheet'>['constraints'][number]),
            segmentKey: 'ghost',
          },
        ],
      },
      [
        { id: 'h_a', name: 'Asha' },
        { id: 'h_b', name: 'Ben' },
      ],
    );
    expect(sheet.segments.map((s) => s.ownerId)).toEqual(['h_a', 'organizer', 'h_b']);
    expect(sheet.constraints).toHaveLength(1);
    expect(sheet.constraints[0]).toMatchObject({ segmentId: 's_lunch', severity: 'hard' });
  });

  it('builds a deterministic fallback with need-based constraints', () => {
    const sheet = fallbackRunSheet(240, ['lunch'], {
      'age:senior': 2,
      'diet:diabetic_friendly': 1,
      'age:child': 3,
    });
    expect(sheet.segments.map((s) => s.id)).toEqual([
      's_welcome',
      's_meal',
      's_cake',
      's_activities',
      's_farewell',
    ]);
    expect(sheet.constraints.map((c) => c.needGroup)).toEqual([
      'senior',
      'diabetic_friendly',
      'child',
    ]);
    expect(fallbackRunSheet(60, ['snacks'], {}).constraints).toEqual([]);
  });

  it('edits durations (shifting later segments) and moves segments, never past locked ones', () => {
    const segs = [
      makeSegment({ id: 'a', offsetMin: 0, durationMin: 30 }),
      makeSegment({ id: 'b', offsetMin: 30, durationMin: 20 }),
      makeSegment({ id: 'c', offsetMin: 50, locked: true }),
    ];
    expect(setDuration(segs, 'a', 40).map((s) => s.offsetMin)).toEqual([0, 40, 50]);
    expect(setDuration(segs, 'zz', 40)).toBe(segs);
    expect(moveSegment(segs, 'b', 'up').find((s) => s.id === 'b')?.offsetMin).toBe(0);
    expect(moveSegment(segs, 'b', 'down')).toBe(segs);
    expect(moveSegment(segs, 'a', 'up')).toBe(segs);
  });

  it('describes breaks and builds a name-free recovery request', () => {
    const segs = [makeSegment({ id: 's_1', title: 'Lunch', offsetMin: 90, ownerId: 'h_priya' })];
    expect(
      describeBreak(
        makeConstraint({ reason: 'Seniors eat by 13:20' }),
        segs,
        '2030-06-01T12:00:00',
        10,
      ),
    ).toBe('Seniors eat by 13:20 — “Lunch” would start at 13:30, 10 min late.');
    expect(
      describeBreak(makeConstraint({ segmentId: 'x' }), segs, '2030-06-01T12:00:00', 5),
    ).toMatch(/5 min late/);
    expect(breakAnnouncement(['X.'], 0)).toMatch(/no safe automatic fix/i);
    const input = recoveryInput(
      segs,
      [{ constraintId: 'c_1', byMin: 10 }],
      [makeConstraint()],
      { food: 1, comfort: 1, decor: 1, entertainment: 1, photos: 1 },
      40,
    );
    expect(JSON.stringify(input)).not.toContain('h_priya');
    expect(input.breaks[0]?.reason).toBe('Seniors eat early');
  });
});

describe('RunSheetScreen', () => {
  beforeEach(() => {
    useStore.getState().deleteAllData();
    useStore.getState().loadDemo();
    cacheClear();
  });

  it('shows constraints, reorders with Move buttons and shows violations inline', async () => {
    const { container } = renderApp('/runsheet');
    const user = userEvent.setup();
    expect(await screen.findByRole('region', { name: /guest constraints/i })).toHaveTextContent(
      /Seniors eat lunch by 13:20/,
    );
    expect(await axe(container)).toHaveNoViolations();
    const buttons = screen.getAllByRole('button', { name: /move down/i });
    const lunchDown = buttons.find((b) => b.textContent === 'Move down: Lunch service');
    if (!lunchDown) throw new Error('missing');
    await user.click(lunchDown);
    expect(await screen.findAllByText(/misses by/i)).not.toHaveLength(0);
    expect(
      screen.getAllByText(/Problem: Seniors eat lunch by 13:20 — misses by/).length,
    ).toBeGreaterThan(0);
  });

  it('drafts a run sheet with the AI and falls back offline', async () => {
    vi.stubGlobal('fetch', json(AI_OUTPUTS.runSheet));
    renderApp('/runsheet');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /redraft run sheet/i }));
    expect(await screen.findByRole('heading', { name: 'Kids games' })).toBeVisible();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 502 })),
    );
    useStore.getState().upsertHelper({ id: 'h_new', name: 'New' }); // new input → no cache hit
    await user.click(screen.getByRole('button', { name: /redraft run sheet/i }));
    expect(await screen.findByText(/standard run sheet was used/i)).toBeVisible();
  });
});

describe('LiveScreen', () => {
  beforeEach(() => {
    useStore.getState().deleteAllData();
    useStore.getState().loadDemo();
    cacheClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('+5 with no breaks shifts the schedule and announces "No conflicts"', async () => {
    renderApp('/live');
    await screen.findByLabelText(/rehearsal clock/i);
    setClock(40);
    await userEvent.click(screen.getByRole('button', { name: 'Running late +5' }));
    expect(screen.getByTestId('live-polite')).toHaveTextContent(
      'Schedule shifted by 5 minutes. No conflicts.',
    );
    expect(useStore.getState().runSheet?.delayLog.at(-1)?.minutes).toBe(5);
  });

  it('cake 25 min late: breaks announced assertively, AI options ranked and applied by keyboard', async () => {
    vi.stubGlobal('fetch', json(AI_OUTPUTS.recovery));
    const { container } = renderApp('/live');
    const user = userEvent.setup();
    await screen.findByLabelText(/rehearsal clock/i);
    setClock(40);
    await user.clear(screen.getByLabelText(/custom delay/i));
    await user.type(screen.getByLabelText(/custom delay/i), '25{Enter}');
    const group = await screen.findByRole('group', { name: /ranked options/i });
    expect(screen.getByTestId('live-assertive')).toHaveTextContent(
      /Seniors eat lunch by 13:20 — “Lunch service” would start at 13:30, 10 min late\..*Kids’ games.*\d recovery options? available/,
    );
    expect(await axe(container)).toHaveNoViolations();
    const radios = within(group).getAllByRole('radio');
    expect(radios[0]).toBeChecked();
    expect(within(group).getByText('Serve lunch before cake')).toBeVisible();
    radios[0]?.focus();
    await user.keyboard('{ArrowDown}');
    expect(radios[1]).toBeChecked();
    await user.keyboard('{ArrowUp}');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByTestId('live-assertive')).toHaveTextContent(
      /Applied: Serve lunch before cake\. .*Cue cards updated\./,
    );
    const lunch = useStore.getState().runSheet?.segments.find((s) => s.id === 's_lunch');
    expect(lunch?.offsetMin).toBeLessThanOrEqual(80);
  });

  it('offline: offers the deterministic Quick fix without calling the AI', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderApp('/live');
    await screen.findByLabelText(/rehearsal clock/i);
    setClock(40);
    await userEvent.click(screen.getByRole('button', { name: 'Running late +15' }));
    expect(await screen.findByRole('group', { name: /quick fix/i })).toHaveTextContent('Quick fix');
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(useStore.getState().runSheet?.delayLog.at(-1)?.note).toMatch(/Quick fix/);
  });

  it('marks the current segment done and announces the next one', async () => {
    renderApp('/live');
    await screen.findByLabelText(/rehearsal clock/i);
    setClock(10);
    expect(await screen.findByText('Welcome and seating')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /segment done/i }));
    expect(screen.getByTestId('live-polite')).toHaveTextContent(
      /Done\. Now: Family welcome and toast\./,
    );
  });

  it('asks for a run sheet when there is none', async () => {
    useStore.getState().setRunSheet(undefined);
    renderApp('/live');
    expect(await screen.findByText(/needs a/i)).toBeVisible();
  });
});
