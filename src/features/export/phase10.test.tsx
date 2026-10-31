import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '../../../tests/axe';
import { renderApp } from '../../../tests/renderApp';
import { useStore } from '../../store';
import { useUiStore } from '../../store/uiStore';
import { cacheClear } from '../../ai/cache';
import { csvCell, toCsv } from '../../lib/csv';
import { fallbackInvite, fillPlaceholders, groupSpecifics } from './inviteLogic';

/** jsdom Blobs lack .text(); FileReader works everywhere. */
const readBlob = (b: Blob | undefined) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(b ?? new Blob());
  });

beforeEach(() => {
  useStore.getState().deleteAllData();
  useStore.getState().loadDemo();
  useUiStore.setState({ shortcutsEnabled: true, shortcutsOpen: false });
  cacheClear();
});

describe('export logic', () => {
  it('neutralises CSV formula injection and quotes when needed', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('-5')).toBe("'-5");
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
    expect(csvCell(undefined)).toBe('');
    expect(toCsv([['x', 1]])).toBe('x,1\r\n');
  });

  it('fills invite placeholders locally and picks group specifics by code', () => {
    expect(fillPlaceholders('{date} at {time}', { startsAt: '2030-06-02T12:30:00' })).toBe(
      'Sunday 2 June at 12:30',
    );
    expect(groupSpecifics('mobility:wheelchair', 'outdoor')).toContain(
      'Covered backup if the weather turns',
    );
    expect(groupSpecifics('unknown', 'hall')).toEqual([]);
    expect(fallbackInvite({ title: 'Party' }, ['Ramp'])).toMatch(/For your comfort: Ramp\./);
  });
});

describe('VersionsScreen', () => {
  it('restores an earlier version after confirmation and saves the current plan first', async () => {
    const first = useStore.getState().guests[0];
    if (first) useStore.getState().addGuests([{ ...first, id: 'g_extra', name: 'Extra' }]);
    const { container } = renderApp('/versions');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /restore “loaded demo/i }));
    expect(screen.getByRole('button', { name: 'Yes, restore' })).toHaveFocus();
    expect(await axe(container)).toHaveNoViolations();
    await user.keyboard('{Enter}');
    expect(useStore.getState().guests).toHaveLength(62);
    expect(useStore.getState().versions.some((v) => v.reason.startsWith('Before restoring'))).toBe(
      true,
    );
    expect(screen.getByTestId('live-polite')).toHaveTextContent(/restored the version/i);
  });

  it('refuses a corrupt version with an alert', async () => {
    useStore.setState({
      versions: [
        { id: 'ver_bad', at: '2030-01-01T00:00:00Z', reason: 'Broken', snapshot: { nope: true } },
      ],
    });
    renderApp('/versions');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /restore “broken”/i }));
    await user.click(screen.getByRole('button', { name: 'Yes, restore' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be read/);
    expect(useStore.getState().guests).toHaveLength(62);
  });
});

describe('ExportScreen', () => {
  it('writes an invite for a need group with placeholders filled, and falls back to a template', async () => {
    const fetchMock = vi.fn(
      async (_u: string, _i?: RequestInit) =>
        new Response(
          JSON.stringify({
            data: { text: 'Join us {date} at {time}! Step-free entry at the side gate.' },
          }),
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderApp('/export');
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Audience'), 'mobility:wheelchair');
    await user.click(screen.getByRole('button', { name: 'Write invitation' }));
    const box = await screen.findByLabelText(/invitation for wheelchair users/i);
    expect((box as HTMLTextAreaElement).value).not.toMatch(/\{date\}|\{time\}/);
    const sent = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(sent).toContain('Step-free route from drop-off to seating');
    expect(sent).not.toMatch(/Sharma|Verma/);
    expect(await axe(container)).toHaveNoViolations();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 502 })),
    );
    await user.selectOptions(screen.getByLabelText('Tone'), 'formal');
    await user.click(screen.getByRole('button', { name: 'Write invitation' }));
    expect(await screen.findByText(/simple template was used/i)).toBeVisible();
  });

  it('downloads the .ics and a CSV, created locally', async () => {
    const created: Blob[] = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (b: Blob) => {
          created.push(b);
          return 'blob:x';
        },
        revokeObjectURL: () => undefined,
      }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderApp('/export');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /prep deadlines/i }));
    await user.click(screen.getByRole('button', { name: /guest list/i }));
    expect(click).toHaveBeenCalledTimes(2);
    expect(await readBlob(created[0])).toMatch(/^BEGIN:VCALENDAR/);
    expect(await readBlob(created[1])).toMatch(/^Name,Age band/);
  });

  it('renders print views for the run sheet, cue sheets and helper cards', async () => {
    const { unmount } = renderApp('/print/runsheet');
    expect(await screen.findByRole('table')).toHaveTextContent('Lunch service');
    unmount();
    const cues = renderApp('/print/cues');
    expect(await screen.findByRole('region', { name: 'Priya' })).toHaveTextContent(
      'Cake cutting and song',
    );
    expect(await axe(cues.container)).toHaveNoViolations();
    cues.unmount();
    renderApp('/print/cards');
    expect(await screen.findAllByRole('article')).toHaveLength(4);
  });
});

describe('keyboard shortcuts', () => {
  it('? opens the dialog (focus inside, Esc closes and returns focus) and g then r navigates', async () => {
    const { container } = renderApp('/');
    const user = userEvent.setup();
    const demoButton = await screen.findByRole('button', { name: /load demo/i });
    demoButton.focus();
    await user.keyboard('?');
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(await axe(container)).toHaveNoViolations();
    await user.tab();
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(demoButton).toHaveFocus();
    await user.keyboard('gr');
    expect(await screen.findByRole('heading', { level: 1, name: 'Run sheet' })).toBeVisible();
  });

  it('ignores shortcuts while typing and when turned off', async () => {
    renderApp('/guests');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/paste your guest list/i), 'gt');
    expect(screen.getByRole('heading', { level: 1, name: 'Guest Lens' })).toBeVisible();
    act(() => useUiStore.getState().setShortcutsEnabled(false));
    await user.click(document.body);
    await user.keyboard('gt');
    expect(screen.getByRole('heading', { level: 1, name: 'Guest Lens' })).toBeVisible();
  });

  it('Live: d asks to confirm +5, n marks the segment done', async () => {
    renderApp('/live');
    const user = userEvent.setup();
    await screen.findByLabelText(/rehearsal clock/i);
    await user.click(document.body);
    await user.keyboard('d');
    expect(screen.getByRole('button', { name: 'Confirm +5' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('live-polite')).toHaveTextContent(/shifted by 5 minutes/);
    await user.click(document.body);
    await user.keyboard('n');
    expect(screen.getByTestId('live-polite')).toHaveTextContent(/Done\./);
  });
});
