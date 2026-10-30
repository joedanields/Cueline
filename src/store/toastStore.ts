import { create } from 'zustand';

export type Toast = { id: number; text: string; tone: 'info' | 'warning' };

type ToastState = {
  toasts: Toast[];
  pushToast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
};

let nextId = 1;

/** Session-only notifications (never persisted). Toasts stay until dismissed (WCAG 2.2.1). */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  pushToast: (text, tone = 'info') =>
    set((s) => ({ toasts: [...s.toasts, { id: nextId++, text, tone }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
