import { describe, expect, it } from 'vitest';
import { scheduleTasks, topoOrder, type ScheduledTask } from './schedule';
import { doNext } from './doNext';
import { buildIcs, escapeIcsText, foldLine } from './ics';
import { makeTask } from '../../tests/fixtures/state';

const NOW = new Date('2030-05-01T09:00:00');
const EVENT = '2030-06-01T12:00:00';
const ok = (r: ReturnType<typeof scheduleTasks>) => {
  if (!r.ok) throw new Error('expected schedule');
  return r;
};
const byId = (tasks: ScheduledTask[], id: string) =>
  tasks.find((t) => t.id === id) as ScheduledTask;

describe('schedule', () => {
  const chain = [
    makeTask({ id: 'venue', durationDays: 2, latestStartDaysBefore: 20 }),
    makeTask({ id: 'decor', durationDays: 3, latestStartDaysBefore: 5, dependsOn: ['venue'] }),
    makeTask({ id: 'invite', durationDays: 1, latestStartDaysBefore: 25 }),
  ];

  it('schedules backward from the event date and respects dependencies', () => {
    const { tasks } = ok(scheduleTasks(chain, EVENT, NOW));
    expect(byId(tasks, 'venue')).toMatchObject({ start: '2030-05-12', due: '2030-05-14' });
    expect(byId(tasks, 'decor')).toMatchObject({
      start: '2030-05-27',
      due: '2030-05-30',
      isBlocked: true,
    });
    expect(byId(tasks, 'decor').start >= byId(tasks, 'venue').due).toBe(true);
  });

  it('pulls a prerequisite earlier when a dependent needs it sooner', () => {
    const tasks = [
      makeTask({ id: 'a', durationDays: 2, latestStartDaysBefore: 3 }),
      makeTask({ id: 'b', durationDays: 1, latestStartDaysBefore: 10, dependsOn: ['a'] }),
    ];
    const r = ok(scheduleTasks(tasks, EVENT, NOW));
    expect(byId(r.tasks, 'a').due <= byId(r.tasks, 'b').start).toBe(true);
  });

  it('detects a cycle and returns the cycle keys without looping', () => {
    const cyclic = [
      makeTask({ id: 'a', dependsOn: ['c'] }),
      makeTask({ id: 'b', dependsOn: ['a'] }),
      makeTask({ id: 'c', dependsOn: ['b'] }),
    ];
    const r = scheduleTasks(cyclic, EVENT, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect([...r.cycle].sort()).toEqual(['a', 'b', 'c']);
    expect(topoOrder([makeTask({ id: 'x', dependsOn: ['x', 'missing'] })])).toEqual({
      order: ['x'],
    });
  });

  it('marks dependents at-risk when a task slips, and recomputes the critical path', () => {
    const before = ok(scheduleTasks(chain, EVENT, NOW));
    const slipped = chain.map((t) =>
      t.id === 'venue' ? { ...t, status: 'slipped' as const, slipDays: 15 } : t,
    );
    const after = ok(scheduleTasks(slipped, EVENT, NOW));
    expect(byId(after.tasks, 'venue').isAtRisk).toBe(true);
    expect(byId(after.tasks, 'decor').isAtRisk).toBe(true);
    expect(byId(before.tasks, 'decor').isAtRisk).toBe(false);
    expect(after.criticalPath).toContain('venue');
    expect(after.criticalPath).not.toEqual(before.criticalPath);
  });

  it('flags a task whose latest start is already in the past', () => {
    const late = ok(
      scheduleTasks([makeTask({ id: 'late', latestStartDaysBefore: 60 })], EVENT, NOW),
    );
    expect(late.tasks[0]?.isAtRisk).toBe(true);
    const done = ok(
      scheduleTasks(
        [makeTask({ id: 'late', latestStartDaysBefore: 60, status: 'done' })],
        EVENT,
        NOW,
      ),
    );
    expect(done.tasks[0]?.isAtRisk).toBe(false);
    expect(done.criticalPath).toEqual([]);
  });

  it('unblocks dependents once prerequisites are done', () => {
    const r = ok(
      scheduleTasks(
        chain.map((t) => (t.id === 'venue' ? { ...t, status: 'done' as const } : t)),
        EVENT,
        NOW,
      ),
    );
    expect(byId(r.tasks, 'decor').isBlocked).toBe(false);
  });
});

describe('doNext', () => {
  const t = (id: string, due: string, o: Partial<ScheduledTask> = {}): ScheduledTask => ({
    ...makeTask({ id, title: id }),
    start: due,
    due,
    latestStart: due,
    isCritical: false,
    isAtRisk: false,
    isBlocked: false,
    slackDays: 1,
    ...o,
  });

  it('returns at most 3, excluding blocked and done, critical first then soonest due', () => {
    const list = [
      t('late', '2030-05-20'),
      t('soon', '2030-05-02'),
      t('crit', '2030-05-25', { isCritical: true }),
      t('blocked', '2030-05-01', { isBlocked: true }),
      t('done', '2030-05-01', { status: 'done' }),
      t('mid', '2030-05-10'),
    ];
    expect(doNext(list).map((x) => x.id)).toEqual(['crit', 'soon', 'mid']);
    expect(doNext([t('b', '2030-05-01'), t('a', '2030-05-01')]).map((x) => x.id)).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('ics', () => {
  it('escapes commas, semicolons, backslashes and newlines per RFC 5545', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('folds long lines at 75 octets', () => {
    const folded = foldLine(`SUMMARY:${'é'.repeat(60)}`);
    for (const line of folded.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('builds a calendar with the event and open task deadlines', () => {
    const { tasks } = ok(
      scheduleTasks(
        [
          makeTask({ id: 't_a', title: 'Book hall, garden' }),
          makeTask({ id: 't_b', status: 'done' }),
        ],
        EVENT,
        NOW,
      ),
    );
    const ics = buildIcs(
      { title: 'Party', startsAt: '2030-06-01T12:00:00Z', endsAt: '2030-06-01T16:00:00Z' },
      tasks,
      NOW,
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20300601T120000Z');
    expect(ics).toContain('SUMMARY:Due: Book hall\\, garden');
    expect(ics).toContain('UID:t_a@cueline');
    expect(ics).not.toContain('UID:t_b@cueline');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});
