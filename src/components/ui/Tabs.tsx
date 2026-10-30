import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type TabDef = { id: string; label: string; render: () => ReactNode };

/**
 * WAI-ARIA tabs: arrow keys move between tabs (automatic activation), Home/End jump,
 * roving tabindex so Tab moves straight into the panel.
 */
export function Tabs({ label, tabs, initial }: { label: string; tabs: TabDef[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id ?? '');
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    if (!tab) return;
    setActive(tab.id);
    refs.current[tab.id]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    const target = moves[e.key];
    if (target === undefined) return;
    e.preventDefault();
    focusTab(target);
  };

  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b-2 border-line/40 no-print">
        {tabs.map((t, i) => {
          const selected = t.id === current?.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`min-h-[44px] rounded-t px-4 py-2 font-medium ${selected ? 'bg-accent text-accent-fg' : 'hover:underline'}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {current ? (
        <div role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`} tabIndex={0} className="focus-visible:outline">
          {current.render()}
        </div>
      ) : null}
    </div>
  );
}
