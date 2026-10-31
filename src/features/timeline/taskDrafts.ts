import { differenceInCalendarDays, startOfWeek, format } from 'date-fns';
import type { AiOutput } from '../../shared/aiTasks';
import type { PrepTask } from '../../shared/schemas';
import { topoOrder, type ScheduledTask } from '../../engine/schedule';

type Draft = AiOutput<'prepTasks'>['tasks'][number];
const MAX_CYCLE_BREAKS = 30;

/**
 * AI task drafts → PrepTasks: keys become ids, unknown deps are dropped, and any dependency cycle
 * is broken (by removing the edge that closes it) so the engine can always schedule.
 * @example draftsToTasks([{ key: 'a', dependsOn: ['b'], ... }])
 */
export function draftsToTasks(drafts: Draft[]): PrepTask[] {
  const seen = new Set<string>();
  const unique = drafts.filter((d) => !seen.has(d.key) && seen.add(d.key));
  const keys = new Set(unique.map((d) => d.key));
  let tasks: PrepTask[] = unique.map((d) => ({
    id: `t_${d.key}`.slice(0, 40),
    title: d.title,
    category: d.category,
    durationDays: d.durationDays,
    latestStartDaysBefore: d.latestStartDaysBefore,
    dependsOn: [...new Set(d.dependsOn.filter((k) => keys.has(k) && k !== d.key))].map((k) =>
      `t_${k}`.slice(0, 40),
    ),
    ownerId: d.ownerRole === 'organizer' ? 'organizer' : undefined,
    status: 'todo',
    slipDays: 0,
    needTrigger: d.needTrigger,
  }));
  for (let i = 0; i < MAX_CYCLE_BREAKS; i++) {
    const r = topoOrder(tasks);
    if (!('cycle' in r)) break;
    const [from, to] = [r.cycle.at(-1), r.cycle[0]];
    tasks = tasks.map((t) =>
      t.id === from ? { ...t, dependsOn: t.dependsOn.filter((d) => d !== to) } : t,
    );
  }
  return tasks;
}

export type WeekGroup = { label: string; tasks: ScheduledTask[] };

/**
 * Group scheduled tasks by the week of their due date, labelled relative to the event.
 * @example groupByWeek(tasks, '2030-06-01T12:00:00Z')[0]?.label // 'Week of 13 May · 3 weeks before'
 */
export function groupByWeek(tasks: ScheduledTask[], eventStartsAt: string): WeekGroup[] {
  const event = new Date(eventStartsAt);
  const groups = new Map<string, ScheduledTask[]>();
  for (const t of [...tasks].sort(
    (a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title),
  )) {
    const week = format(
      startOfWeek(new Date(`${t.due}T00:00:00`), { weekStartsOn: 1 }),
      'yyyy-MM-dd',
    );
    groups.set(week, [...(groups.get(week) ?? []), t]);
  }
  return [...groups.entries()].map(([week, list]) => {
    const weeks = Math.floor(differenceInCalendarDays(event, new Date(`${week}T00:00:00`)) / 7);
    const rel = weeks <= 0 ? 'event week' : `${weeks} week${weeks === 1 ? '' : 's'} before`;
    return {
      label: `Week of ${format(new Date(`${week}T00:00:00`), 'd MMM')} · ${rel}`,
      tasks: list,
    };
  });
}
