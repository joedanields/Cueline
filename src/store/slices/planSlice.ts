import type { PlanSlice, SliceCreator } from '../types';
import { upsertById } from './upsert';

export const createPlanSlice: SliceCreator<PlanSlice> = (set) => ({
  event: undefined,
  maybeProbability: 0.5,
  quantityOverrides: {},
  menu: [],
  setEvent: (event) => set({ event }),
  setMaybeProbability: (p) => set({ maybeProbability: Math.min(1, Math.max(0, p)) }),
  setQuantityOverride: (item, amount) =>
    set((s) => {
      const { [item]: _removed, ...rest } = s.quantityOverrides;
      return { quantityOverrides: amount === undefined ? rest : { ...rest, [item]: amount } };
    }),
  upsertDish: (dish) => set((s) => ({ menu: upsertById(s.menu, dish) })),
  removeDish: (id) => set((s) => ({ menu: s.menu.filter((d) => d.id !== id) })),
});
