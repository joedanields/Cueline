import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Page } from '../../components/ui/Page';
import { NeedsFirst } from '../../components/ui/NeedsFirst';
import { Button } from '../../components/ui/Button';
import { useAnnounce } from '../../components/ui/LiveRegion';
import { useStore } from '../../store';
import { selectDoNext, selectSchedule } from '../../store/selectors';
import type { PrepTask } from '../../shared/schemas';
import { groupByWeek } from './taskDrafts';
import { usePrepTasks } from './usePrepTasks';
import { TaskItem } from './components/TaskItem';
import { CycleAlert, DoNext } from './components/DoNext';

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
  const weeks = useMemo(
    () => (schedule?.ok && event ? groupByWeek(schedule.tasks, event.startsAt) : []),
    [schedule, event],
  );

  const onUpdate = useCallback(
    (id: string, patch: Partial<PrepTask>) => {
      updateTask(id, patch);
      const title = titles.get(id) ?? 'Task';
      if (patch.status === 'done') announce(`${title} marked done. Do next updated.`);
      if (patch.status === 'slipped')
        announce(`${title} slipped. Dependent tasks were re-scheduled.`);
    },
    [announce, titles, updateTask],
  );

  if (!event) {
    return (
      <NeedsFirst
        title="Timeline"
        heading="Prep timeline"
        before="Add your"
        to="/intake"
        link="event details"
        after=" first — every deadline counts back from the event date."
      />
    );
  }
  return (
    <Page
      title="Timeline"
      heading="Prep timeline"
      intro={`Deadlines count back from ${format(new Date(event.startsAt), 'EEEE d MMMM yyyy')}.`}
    >
      <DoNext next={next} hasTasks={tasks.length > 0} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={tasks.length ? 'secondary' : 'primary'}
          busy={status === 'loading'}
          busyLabel="Drafting…"
          onClick={() => void draft()}
        >
          {tasks.length
            ? 'Redraft tasks (replaces the list, saved as a version first)'
            : 'Draft prep tasks'}
        </Button>
        {failed ? (
          <p>
            <span aria-hidden="true">ℹ </span>The assistant was unavailable, so a standard task
            list was used.
          </p>
        ) : null}
      </div>
      {schedule && !schedule.ok ? (
        <CycleAlert cycle={schedule.cycle.map((id) => titles.get(id) ?? id)} />
      ) : null}
      {weeks.map((w) => (
        <section key={w.label} aria-label={w.label} className="space-y-2">
          <h2 className="text-lg">{w.label}</h2>
          <ul className="space-y-2">
            {w.tasks.map((t) => (
              <TaskItem key={t.id} task={t} titles={titles} helpers={helpers} onUpdate={onUpdate} />
            ))}
          </ul>
        </section>
      ))}
    </Page>
  );
}
