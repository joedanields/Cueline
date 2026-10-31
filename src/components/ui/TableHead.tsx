type Column = string | { label: string; numeric: true };

/** Column headers with `scope="col"`; numeric columns are right-aligned to match their cells. */
export function TableHead({ columns }: { columns: Column[] }) {
  return (
    <thead>
      <tr>
        {columns.map((c) => {
          const label = typeof c === 'string' ? c : c.label;
          return (
            <th
              key={label}
              scope="col"
              className={typeof c === 'string' ? 'p-2' : 'p-2 text-right'}
            >
              {label}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
