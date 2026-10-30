import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type UiState = {
  shortcutsEnabled: boolean;
  shortcutsOpen: boolean;
  setShortcutsEnabled: (on: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
};

/** Per-viewer UI preferences (not part of the plan). Single-key shortcuts can be turned off (WCAG 2.1.4). */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      shortcutsEnabled: true,
      shortcutsOpen: false,
      setShortcutsEnabled: (shortcutsEnabled) => set({ shortcutsEnabled }),
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
    }),
    {
      name: 'cueline-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ shortcutsEnabled: s.shortcutsEnabled }),
      merge: (persisted, current) => ({
        ...current,
        shortcutsEnabled: typeof (persisted as { shortcutsEnabled?: unknown } | undefined)?.shortcutsEnabled === 'boolean'
          ? Boolean((persisted as { shortcutsEnabled: boolean }).shortcutsEnabled)
          : current.shortcutsEnabled,
      }),
    },
  ),
);
