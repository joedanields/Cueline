import { format } from 'date-fns';
import type { ScheduledTask } from '../../../engine/schedule';

type Props = { next: ScheduledTask[]; hasTasks: boolean };

/** The few tasks ready to start now, most urgent first. */
export function DoNext({ next, hasTasks }: Props) {
  return (
    <section aria-labelledby="donext-heading" className="card space-y-2 border-accent">
      <h2 id="donext-heading">Do next</h2>
      {next.length ? (
        <ol className="list-decimal space-y-1 pl-6">
          {next.map((t) => (
            <li key={t.id}>
              <strong>{t.title}</strong> — due {format(new Date(`${t.due}T00:00:00`), 'd MMM')}
              {t.isCritical ? ' (critical path)' : ''}
            </li>
          ))}
        </ol>
      ) : (
        <p>
          {hasTasks
            ? 'Nothing is ready to start — everything is done or waiting on something else.'
            : 'No tasks yet.'}
        </p>
      )}
    </section>
  );
}

/** A dependency loop can't be scheduled; name the tasks so the organizer can break it. */
export function CycleAlert({ cycle }: { cycle: string[] }) {
  return (
    <p role="alert" className="card border-danger">
      <span aria-hidden="true">⚠ </span>These tasks depend on each other in a loop:{' '}
      {cycle.join(' → ')}. Change an owner or remove a dependency.
    </p>
  );
}
