import { Badge } from '../../../components/ui/Badge';
import { constraintBreak } from '../../../engine/runSheet';
import type { GuestConstraint, Segment } from '../../../shared/schemas';

type Props = { constraints: GuestConstraint[]; byId: Map<string, Segment> };

/** Each guest constraint with a met / missed-by-N-minutes status (icon + text, not colour alone). */
export function ConstraintList({ constraints, byId }: Props) {
  return (
    <section aria-labelledby="constraints-heading" className="card space-y-2">
      <h2 id="constraints-heading">Guest constraints</h2>
      {constraints.length === 0 ? (
        <p className="text-muted">None.</p>
      ) : (
        <ul className="space-y-1">
          {constraints.map((c) => {
            const by = constraintBreak(c, byId);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                {by > 0 ? (
                  <Badge tone="danger" icon="⚠">
                    Misses by {by} min
                  </Badge>
                ) : (
                  <Badge tone="ok" icon="✓">
                    Met
                  </Badge>
                )}
                <span>{c.reason}</span>
                <span className="text-sm text-muted">
                  ({c.severity === 'hard' ? 'must' : 'should'} ·{' '}
                  {byId.get(c.segmentId)?.title ?? 'removed segment'})
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
