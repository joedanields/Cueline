import type { PlanSlice, SliceCreator } from '../types';

export const createPlanSlice: SliceCreator<PlanSlice> = (set) => ({
  event: undefined,
  maybeProbability: 0.5,
  quantityOverrides: {},
  setEvent: (event) => set({ event }),
  setMaybeProbability: (p) => set({ maybeProbability: Math.min(1, Math.max(0, p)) }),
  setQuantityOverride: (item, amount) =>
    set((s) => {
      const { [item]: _removed, ...rest } = s.quantityOverrides;
      return { quantityOverrides: amount === undefined ? rest : { ...rest, [item]: amount } };
    }),
});
