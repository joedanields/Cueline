import { useEffect, useRef, type ReactNode } from 'react';

const APP_NAME = 'Cueline';
let hasRenderedFirstPage = false;

type PageProps = {
  title: string;
  /** Visible heading; defaults to `title`. */
  heading?: string;
  intro?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

/**
 * Route wrapper: owns the single <h1>, updates document.title and moves focus to the heading
 * on client-side navigation (not on first load) so screen-reader users hear the new page.
 */
export function Page({ title, heading, intro, actions, children }: PageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
    if (hasRenderedFirstPage) headingRef.current?.focus();
    hasRenderedFirstPage = true;
  }, [title]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 ref={headingRef} tabIndex={-1} className="focus:outline-none focus-visible:outline">
            {heading ?? title}
          </h1>
          {intro ? <div className="max-w-prose text-muted">{intro}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 no-print">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Test helper: reset first-load detection between tests. */
export function resetPageFocusTracking(): void {
  hasRenderedFirstPage = false;
}
