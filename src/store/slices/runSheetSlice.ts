import type { RunSheetSlice, SliceCreator } from '../types';

export const createRunSheetSlice: SliceCreator<RunSheetSlice> = (set) => ({
  runSheet: undefined,
  setRunSheet: (runSheet) => set({ runSheet }),
});
