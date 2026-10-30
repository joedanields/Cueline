import type { SliceCreator, VendorSlice } from '../types';
import { upsertById } from './upsert';

export const createVendorSlice: SliceCreator<VendorSlice> = (set) => ({
  vendors: [],
  upsertVendor: (vendor) => set((s) => ({ vendors: upsertById(s.vendors, vendor) })),
  removeVendor: (id) =>
    set((s) => ({
      vendors: s.vendors.filter((v) => v.id !== id),
      // Budget lines keep their amount but lose the link to the removed vendor.
      budget: s.budget.map((l) => (l.vendorId === id ? { ...l, vendorId: undefined } : l)),
    })),
});
