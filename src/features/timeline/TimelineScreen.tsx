import { useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import { format } from 'date-fns';
import { Page } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';
import { selectDoNext, selectSchedule } from '../../store/selectors';
import type { PrepTask } from '../../shared/schemas';
import { groupByWeek } from './taskDrafts';
import { usePrepTasks } from './usePrepTasks';
import { TaskItem } from './components/TaskItem';

export default function TimelineScreen() {
  const event = useStore((s) => s.event);
  const tasks = useStore((s) => s.tasks);
  const helpers = useStore((s) => s.helpers);
  const schedule = useStore(selectSchedule);
  const next = useStore(selectDoNext);
  const updateTask = useStore((s) => s.updateTask);
  const announce = useAnnounce();
  const { draft, status, failed } = usePrepTasks();
  const titles = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks]);
  const weeks = useMemo(() => (schedule?.ok && event ? groupByWeek(schedule.tasks, event.startsAt) : []), [schedule, event]);

  const onUpdate = useCallback(
    (id: string, patch: Partial<PrepTask>) => {
      updateTask(id, patch);
      const title = titles.get(id) ?? 'Task';
      if (patch.status === 'done') announce(`${title} marked done. Do next updated.`);
      if (patch.status === 'slipped') announce(`${title} slipped. Dependent tasks were re-scheduled.`);
    },
    [announce, titles, updateTask],
  );

  if (!event) {
    return <Page title="Timeline" heading="Prep timeline"><p className="card">Add your <Link to="/intake" className="underline">event details</Link> first — every deadline counts back from the event date.</p></Page>;
  }
  return (
    <Page title="Timeline" heading="Prep timeline" intro={`Deadlines count back from ${format(new Date(event.startsAt), 'EEEE d MMMM yyyy')}.`}>
      <section aria-labelledby="donext-heading" className="card space-y-2 border-accent">
        <h2 id="donext-heading">Do next</h2>
        {next.length ? (
          <ol className="list-decimal space-y-1 pl-6">
            {next.map((t) => <li key={t.id}><strong>{t.title}</strong> — due {format(new Date(`${t.due}T00:00:00`), 'd MMM')}{t.isCritical ? ' (critical path)' : ''}</li>)}
          </ol>
        ) : <p>{tasks.length ? 'Nothing is ready to start — everything is done or waiting on something else.' : 'No tasks yet.'}</p>}
      </section>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={tasks.length ? 'secondary' : 'primary'} busy={status === 'loading'} busyLabel="Drafting…" onClick={() => void draft()}>
          {tasks.length ? 'Redraft tasks (replaces the list, saved as a version first)' : 'Draft prep tasks'}
        </Button>
        {failed ? <p><span aria-hidden="true">ℹ </span>The assistant was unavailable, so a standard task list was used.</p> : null}
      </div>
      {schedule && !schedule.ok ? (
        <p role="alert" className="card border-danger"><span aria-hidden="true">⚠ </span>These tasks depend on each other in a loop: {schedule.cycle.map((id) => titles.get(id) ?? id).join(' → ')}. Change an owner or remove a dependency.</p>
      ) : null}
      {weeks.map((w) => (
        <section key={w.label} aria-label={w.label} className="space-y-2">
          <h2 className="text-lg">{w.label}</h2>
          <ul className="space-y-2">
            {w.tasks.map((t) => <TaskItem key={t.id} task={t} titles={titles} helpers={helpers} onUpdate={onUpdate} />)}
          </ul>
        </section>
      ))}
    </Page>
  );
}
