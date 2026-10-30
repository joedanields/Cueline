import { addMinutes, format } from 'date-fns';
import type { CelebrationEvent, Helper, PrepTask, RunSheet } from '../../shared/schemas';
import type { ScheduledTask } from '../../engine/schedule';
import type { HelperCardData } from '../../lib/urlState';

export type Assignments = {
  tasks: { title: string; due: string }[];
  segments: { time: string; title: string; cue: string }[];
};

/**
 * Everything assigned to one helper: their prep tasks and run-sheet cues in time order.
 * @example assignmentsFor('h_priya', scheduled, runSheet, event.startsAt).segments[0]?.time // '12:45'
 */
export function assignmentsFor(helperId: string, tasks: (PrepTask | ScheduledTask)[], runSheet: RunSheet | undefined, startsAt: string | undefined): Assignments {
  const start = startsAt ? new Date(startsAt) : undefined;
  return {
    tasks: tasks
      .filter((t) => t.ownerId === helperId && t.status !== 'done')
      .map((t) => ({ title: t.title, due: 'due' in t ? t.due : '' })),
    segments: (runSheet?.segments ?? [])
      .filter((s) => s.ownerId === helperId && s.status !== 'skipped')
      .sort((a, b) => a.offsetMin - b.offsetMin)
      .map((s) => ({ time: start ? format(addMinutes(start, s.offsetMin), 'HH:mm') : `+${s.offsetMin} min`, title: s.title, cue: s.cue })),
  };
}

/**
 * Pseudonymous label sent to the AI instead of the helper's name ("Helper A", "Helper B"…).
 * @example helperLabel(1) // 'Helper B'
 */
export function helperLabel(index: number): string {
  return `Helper ${String.fromCharCode(65 + (index % 26))}`;
}

/**
 * Put the real name back into an AI brief written for "Helper A".
 * @example restoreHelperName('Helper A owns the gate', 'Helper A', 'Arjun') // 'Arjun owns the gate'
 */
export function restoreHelperName(text: string, label: string, name: string): string {
  return text.split(label).join(name);
}

/**
 * The data behind a printable/shareable helper card — only this helper's information.
 * @example buildHelperCard(helper, event, assignments).name // 'Priya'
 */
export function buildHelperCard(h: Helper, event: CelebrationEvent, a: Assignments): HelperCardData {
  return {
    v: 1,
    name: h.name,
    event: { title: event.title, startsAt: event.startsAt, venueType: event.venueType },
    brief: h.brief,
    tasks: a.tasks.slice(0, 30).map((t) => ({ title: t.title.slice(0, 100), due: t.due.slice(0, 20) })),
    segments: a.segments.slice(0, 30),
  };
}
