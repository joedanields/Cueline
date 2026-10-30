import { addDays, differenceInCalendarDays, formatISO, startOfDay } from 'date-fns';
import type { PrepTask } from '../shared/schemas';

export type ScheduledTask = PrepTask & {
  /** Planned start (ISO date) after dependencies and slips. */
  start: string;
  /** Planned finish (ISO date). */
  due: string;
  /** Latest start that still keeps the event on time (ISO date). */
  latestStart: string;
  isCritical: boolean;
  isAtRisk: boolean;
  isBlocked: boolean;
  /** Days of room before this task delays something; negative = already late. */
  slackDays: number;
};

export type ScheduleResult =
  | { ok: true; tasks: ScheduledTask[]; criticalPath: string[] }
  | { ok: false; cycle: string[] };

/**
 * Topological order of task ids, or the ids forming a dependency cycle. Unknown deps are ignored.
 * @example topoOrder([{ id: 'a', dependsOn: ['b'] }, { id: 'b', dependsOn: [] }]) // { order: ['b','a'] }
 */
export function topoOrder(tasks: Pick<PrepTask, 'id' | 'dependsOn'>[]): { order: string[] } | { cycle: string[] } {
  const ids = new Set(tasks.map((t) => t.id));
  const deps = new Map(tasks.map((t) => [t.id, t.dependsOn.filter((d) => ids.has(d) && d !== t.id)]));
  const state = new Map<string, 'visiting' | 'done'>();
  const order: string[] = [];
  const stack: string[] = [];

  const visit = (id: string): string[] | null => {
    if (state.get(id) === 'done') return null;
    if (state.get(id) === 'visiting') return stack.slice(stack.indexOf(id));
    state.set(id, 'visiting');
    stack.push(id);
    for (const dep of deps.get(id) ?? []) {
      const cycle = visit(dep);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, 'done');
    order.push(id);
    return null;
  };
  for (const t of tasks) {
    const cycle = visit(t.id);
    if (cycle) return { cycle };
  }
  return { order };
}

/**
 * Backward-schedule prep tasks from the event day, then push forward for slips and late prereqs.
 * Day numbers are calendar days from `now` (today = 0). Pure: `now` is injected.
 * @example scheduleTasks(tasks, '2030-06-01T12:00:00Z', new Date('2030-05-01'))
 */
export function scheduleTasks(tasks: PrepTask[], eventStartsAt: string, now: Date): ScheduleResult {
  const topo = topoOrder(tasks);
  if ('cycle' in topo) return { ok: false, cycle: topo.cycle };
  const today = startOfDay(now);
  const eventDay = differenceInCalendarDays(new Date(eventStartsAt), today);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const dependents = new Map<string, string[]>();
  for (const t of tasks) for (const d of t.dependsOn) if (byId.has(d)) dependents.set(d, [...(dependents.get(d) ?? []), t.id]);

  // Backward pass (dependents before prereqs): latest finish ≤ dependents' latest start.
  const latestStart = new Map<string, number>();
  for (const id of [...topo.order].reverse()) {
    const t = byId.get(id) as PrepTask;
    const ownFinish = eventDay - t.latestStartDaysBefore + t.durationDays;
    const depStarts = (dependents.get(id) ?? []).map((d) => latestStart.get(d) ?? eventDay);
    const finish = Math.min(ownFinish, eventDay, ...depStarts);
    latestStart.set(id, finish - t.durationDays);
  }

  // Forward pass: planned start = latest start + slip, never before unfinished prereqs end.
  const start = new Map<string, number>();
  const earliest = new Map<string, number>();
  for (const id of topo.order) {
    const t = byId.get(id) as PrepTask;
    const open = t.dependsOn.filter((d) => byId.get(d) && byId.get(d)?.status !== 'done');
    const prereqDue = Math.max(-Infinity, ...open.map((d) => (start.get(d) ?? 0) + (byId.get(d)?.durationDays ?? 0)));
    const prereqEarliest = Math.max(0, ...open.map((d) => (earliest.get(d) ?? 0) + (byId.get(d)?.durationDays ?? 0)));
    start.set(id, Math.max((latestStart.get(id) ?? 0) + t.slipDays, prereqDue));
    earliest.set(id, prereqEarliest + t.slipDays);
  }
  return buildResult(tasks, { today, eventDay, latestStart, start, earliest });
}

type Passes = { today: Date; eventDay: number; latestStart: Map<string, number>; start: Map<string, number>; earliest: Map<string, number> };

function buildResult(tasks: PrepTask[], p: Passes): ScheduleResult {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const iso = (day: number) => formatISO(addDays(p.today, day), { representation: 'date' });
  const slack = (t: PrepTask) => (p.latestStart.get(t.id) ?? 0) - (p.earliest.get(t.id) ?? 0);
  const open = tasks.filter((t) => t.status !== 'done');
  const minSlack = Math.min(...open.map(slack));

  const scheduled = tasks.map((t): ScheduledTask => {
    const ls = p.latestStart.get(t.id) ?? 0;
    const s = p.start.get(t.id) ?? ls;
    const done = t.status === 'done';
    const notStarted = t.status === 'todo' || t.status === 'slipped';
    return {
      ...t, start: iso(s), due: iso(s + t.durationDays), latestStart: iso(ls), slackDays: slack(t),
      isCritical: !done && slack(t) === minSlack,
      isBlocked: t.dependsOn.some((d) => byId.has(d) && byId.get(d)?.status !== 'done'),
      isAtRisk: !done && (s > ls || (notStarted && ls < 0) || s + t.durationDays < 0 || s + t.durationDays > p.eventDay),
    };
  });
  const criticalPath = scheduled.filter((t) => t.isCritical).sort((a, b) => a.start.localeCompare(b.start)).map((t) => t.id);
  return { ok: true, tasks: scheduled, criticalPath };
}
