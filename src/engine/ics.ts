import type { CelebrationEvent } from '../shared/schemas';
import type { ScheduledTask } from './schedule';

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;

/**
 * Escape TEXT values per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline).
 * @example escapeIcsText('Hall; side gate, 2nd floor') // 'Hall\\; side gate\\, 2nd floor'
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold a content line to ≤ 75 octets per RFC 5545 §3.1 (continuation lines start with a space).
 * @example foldLine('X'.repeat(80)).includes('\r\n ') // true
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const ch of line) {
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (encoder.encode(current + ch).length > limit) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

const icsDate = (isoDate: string) => isoDate.slice(0, 10).replace(/-/g, '');
const icsStamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/**
 * Calendar file with one all-day VEVENT per open prep-task deadline plus the event itself.
 * @example buildIcs(event, scheduledTasks, new Date()).startsWith('BEGIN:VCALENDAR') // true
 */
export function buildIcs(
  event: Pick<CelebrationEvent, 'title' | 'startsAt' | 'endsAt'>,
  tasks: ScheduledTask[],
  now: Date,
): string {
  const stamp = icsStamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cueline//Prep deadlines//EN',
    'CALSCALE:GREGORIAN',
  ];
  lines.push(
    'BEGIN:VEVENT',
    'UID:event@cueline',
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsStamp(new Date(event.startsAt))}`,
    `DTEND:${icsStamp(new Date(event.endsAt))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    'END:VEVENT',
  );
  for (const t of tasks.filter((x) => x.status !== 'done')) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@cueline`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(t.due)}`,
      `SUMMARY:${escapeIcsText(`Due: ${t.title}`)}`,
      `DESCRIPTION:${escapeIcsText(`Prep task for ${event.title}. Start by ${t.latestStart}.`)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}
