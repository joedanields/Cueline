import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useUiStore } from '../store/uiStore';

const SEQUENCE_TIMEOUT_MS = 1500;
const GO_TO: Record<string, string> = { g: '/guests', r: '/runsheet', t: '/timeline', l: '/live' };

/**
 * True when a key press should be left alone: typing in a field, using modifiers,
 * or inside an open dialog.
 */
export function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target;
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) ||
    Boolean(t.closest('[role="dialog"]'))
  );
}

/** Global shortcuts: `?` opens help, `g` + letter navigates. Respects the on/off setting. */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUiStore.getState();
      if (e.key === '?' && !isTypingTarget(e)) {
        e.preventDefault();
        ui.setShortcutsOpen(true);
        return;
      }
      if (!ui.shortcutsEnabled || isTypingTarget(e)) return;
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const to = GO_TO[e.key.toLowerCase()];
        if (to) {
          e.preventDefault();
          navigate(to);
        }
        return;
      }
      if (e.key.toLowerCase() === 'g')
        pendingG.current = window.setTimeout(() => {
          pendingG.current = null;
        }, SEQUENCE_TIMEOUT_MS);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (pendingG.current !== null) window.clearTimeout(pendingG.current);
    };
  }, [navigate]);
}

/** Register a single-key handler (used by Live mode for `d` and `n`). */
export function useKeyShortcut(key: string, handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        !useUiStore.getState().shortcutsEnabled ||
        isTypingTarget(e) ||
        e.key.toLowerCase() !== key
      )
        return;
      e.preventDefault();
      ref.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [key]);
}
