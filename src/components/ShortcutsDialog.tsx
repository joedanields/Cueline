import { Dialog } from './ui/Dialog';
import { useUiStore } from '../store/uiStore';

export const SHORTCUTS: [keys: string, action: string][] = [
  ['?', 'Open this list of shortcuts'],
  ['g then g', 'Go to Guests'],
  ['g then r', 'Go to Run sheet'],
  ['g then t', 'Go to Timeline'],
  ['g then l', 'Go to Live mode'],
  ['d (in Live mode)', 'Running late +5 minutes (asks you to confirm)'],
  ['n (in Live mode)', 'Mark the current segment done'],
];

/** In-app keyboard help (ACCESSIBILITY.md keyboard map) with a switch to turn shortcuts off. */
export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  const enabled = useUiStore((s) => s.shortcutsEnabled);
  const setEnabled = useUiStore((s) => s.setShortcutsEnabled);

  return (
    <Dialog open={open} title="Keyboard shortcuts" onClose={() => setOpen(false)}>
      <label className="mb-4 flex min-h-[44px] items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Single-key shortcuts on
      </label>
      <p className="mb-3 text-sm text-muted">Shortcuts never fire while you are typing in a field.</p>
      <table className="w-full text-left">
        <caption className="sr-only">Keyboard shortcuts</caption>
        <thead>
          <tr>
            <th scope="col" className="p-2">Keys</th>
            <th scope="col" className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map(([keys, action]) => (
            <tr key={keys} className="border-t border-line/40">
              <td className="p-2"><kbd className="rounded border border-line px-1">{keys}</kbd></td>
              <td className="p-2">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
