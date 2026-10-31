import { useEffect, useId, useRef, type ReactNode } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Esc closes; Tab and Shift+Tab wrap around the dialog's focusable elements. */
function trapKey(e: KeyboardEvent, node: HTMLElement, onClose: () => void) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    onClose();
    return;
  }
  if (e.key !== 'Tab') return;
  const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
  const first = items[0];
  const last = items.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last?.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first?.focus();
  }
}

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode };

/**
 * Modal dialog: labelled by its title, focus moves in and is trapped, Esc closes,
 * and focus returns to whatever opened it.
 */
export function Dialog({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => returnTo.current?.focus();
  }, [open]);

  // Esc/Tab handling on the dialog container is the APG focus-trap pattern.
  useEffect(() => {
    const node = ref.current;
    if (!open || !node) return;
    const onKeyDown = (e: KeyboardEvent) => trapKey(e, node, onClose);
    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-bg p-6 text-fg shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded border-2 border-line"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
