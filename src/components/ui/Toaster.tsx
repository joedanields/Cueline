import { useToastStore } from '../../store/toastStore';

/** Renders session toasts. Each toast is a status message that stays until dismissed. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismissToast);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 flex max-w-sm flex-col gap-2 no-print"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`card flex items-start gap-3 shadow-lg ${t.tone === 'warning' ? 'border-warn' : ''}`}
        >
          <p className="flex-1">
            {t.tone === 'warning' ? (
              <span className="font-semibold text-warn">Notice: </span>
            ) : null}
            {t.text}
          </p>
          <button
            type="button"
            className="min-h-[24px] min-w-[24px] rounded px-2 underline"
            onClick={() => dismiss(t.id)}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
