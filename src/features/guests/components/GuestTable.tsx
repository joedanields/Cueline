import { useCallback } from 'react';
import { useAnnounce } from '../../../components/ui/LiveRegion';
import type { Guest } from '../../../shared/schemas';
import { useStore } from '../../../store';
import { useRsvpChange } from '../useRsvpChange';
import { GuestRow } from './GuestRow';

const COLUMNS = ['Age', 'Diet', 'Mobility', 'Sensory', 'Travel', 'Role', 'RSVP', 'Actions'];

/** The editable guest list as a real table (caption, row headers) that scrolls horizontally. */
export function GuestTable({ guests, caption }: { guests: Guest[]; caption: string }) {
  const updateGuest = useStore((s) => s.updateGuest);
  const removeGuest = useStore((s) => s.removeGuest);
  const changeRsvp = useRsvpChange();
  const announce = useAnnounce();
  const onRsvp = useCallback(
    (g: Guest, rsvp: Guest['rsvp']) => changeRsvp([g.id], rsvp, g.name),
    [changeRsvp],
  );
  const onRemove = useCallback(
    (g: Guest) => {
      removeGuest(g.id);
      announce(`Removed ${g.name}.`);
    },
    [announce, removeGuest],
  );

  if (guests.length === 0) return <p className="text-muted">No guests match.</p>;
  return (
    // Focusable so keyboard users can scroll the wide table horizontally.
    <div
      className="overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label="Guest table, scrolls sideways"
    >
      <table className="w-full min-w-[60rem] text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="p-2">
              Guest
            </th>
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className="p-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guests.map((g) => (
            <GuestRow
              key={g.id}
              guest={g}
              onUpdate={updateGuest}
              onRsvp={onRsvp}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
