import type { GuestSlice, SliceCreator } from '../types';

const MAX_LOG_ENTRIES = 50;

export const createGuestSlice: SliceCreator<GuestSlice> = (set) => ({
  guests: [],
  changeLog: [],
  addGuests: (guests) => set((s) => ({ guests: [...s.guests, ...guests] })),
  updateGuest: (id, patch) =>
    set((s) => ({ guests: s.guests.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
  removeGuest: (id) => set((s) => ({ guests: s.guests.filter((g) => g.id !== id) })),
  setRsvp: (ids, rsvp) => {
    const targets = new Set(ids);
    set((s) => ({ guests: s.guests.map((g) => (targets.has(g.id) ? { ...g, rsvp } : g)) }));
  },
  logChange: (text) =>
    set((s) => ({
      changeLog: [{ at: new Date().toISOString(), text }, ...s.changeLog].slice(0, MAX_LOG_ENTRIES),
    })),
});
