import type { ScheduledTask } from './schedule';

export const DO_NEXT_LIMIT = 3;

/**
 * Top actionable tasks: not done, not blocked; critical first, then soonest due, then title.
 * @example doNext(scheduled).map((t) => t.title) // up to 3 titles
 */
export function doNext(tasks: ScheduledTask[], limit = DO_NEXT_LIMIT): ScheduledTask[] {
  return tasks
    .filter((t) => t.status !== 'done' && !t.isBlocked)
    .sort(
      (a, b) =>
        Number(b.isCritical) - Number(a.isCritical) ||
        a.due.localeCompare(b.due) ||
        a.title.localeCompare(b.title),
    )
    .slice(0, limit);
}
