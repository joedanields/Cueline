import { useStore } from '../../../store';
import { selectCoverage } from '../../../store/selectors';
import { needLabel } from '../../../engine/needs';
import { Badge } from '../../../components/ui/Badge';
import { TableHead } from '../../../components/ui/TableHead';

/** Every dietary group needs enough suitable mains; gaps say exactly how many more to add. */
export function CoverageTable() {
  const cells = useStore(selectCoverage);
  return (
    <section aria-labelledby="coverage-heading" className="space-y-2">
      <h2 id="coverage-heading">Coverage by dietary group</h2>
      {cells.length === 0 ? (
        <p className="text-muted">No dietary needs among your guests yet.</p>
      ) : (
        <table className="w-full text-left">
          <caption className="sr-only">Menu coverage: suitable mains per dietary group</caption>
          <TableHead
            columns={[
              'Group',
              { label: 'Guests', numeric: true },
              { label: 'Suitable mains', numeric: true },
              'Status',
            ]}
          />
          <tbody>
            {cells.map((c) => (
              <tr key={c.group} className="border-t border-line/40">
                <th scope="row" className="p-2">
                  {needLabel(`diet:${c.group}`)}
                </th>
                <td className="p-2 text-right tabular-nums">{c.members}</td>
                <td className="p-2 text-right tabular-nums">
                  {c.dishes} of {c.required}
                </td>
                <td className="p-2">
                  {c.ok ? (
                    <Badge tone="ok" icon="✓">
                      Covered
                    </Badge>
                  ) : (
                    <Badge tone="danger" icon="⚠">
                      Gap: add {c.required - c.dishes} more
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
