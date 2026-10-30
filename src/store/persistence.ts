import type { PersistStorage, StorageValue } from 'zustand/middleware';
import {
  PersistedStateSchema,
  SCHEMA_VERSION,
  VersionListSchema,
  type PersistedState,
  type Version,
} from '../shared/schemas';
import type { StoreState } from './types';

export const STORAGE_KEY = 'cueline-plan';
export const CORRUPT_MESSAGE =
  "Your saved plan couldn't be read, so Cueline started a fresh one. Nothing was sent anywhere.";

/** What is written to localStorage: the plan plus its version history. */
export type StoredState = PersistedState & { versions: Version[] };

const StoredStateSchema = PersistedStateSchema.extend({ versions: VersionListSchema.default([]) });

/** Marker produced when the raw string isn't JSON; it fails validation like any bad shape. */
const CORRUPT = { corrupt: true } as const;

/** Extract the persistable part of the store (derived data and actions are never stored). */
export function pickPersisted(s: StoreState): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    event: s.event,
    guests: s.guests,
    budget: s.budget,
    vendors: s.vendors,
    helpers: s.helpers,
    tasks: s.tasks,
    runSheet: s.runSheet,
    checklist: s.checklist,
    maybeProbability: s.maybeProbability,
    quantityOverrides: s.quantityOverrides,
    menu: s.menu,
  };
}

/** localStorage adapter that never throws: unreadable JSON becomes a value that fails validation. */
export const safeStorage: PersistStorage<unknown> = {
  getItem: (name) => {
    let raw: string | null;
    try {
      raw = localStorage.getItem(name);
    } catch {
      return null; // storage blocked (private mode) — run without persistence
    }
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as StorageValue<unknown>;
    } catch {
      return { state: CORRUPT, version: SCHEMA_VERSION };
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage blocked: keep working in memory.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

/**
 * Validate stored state before it touches the store. Anything that fails the schema
 * (tampering, old format, truncated write) resets to the current (empty) state.
 */
export function mergePersisted(
  persisted: unknown,
  current: StoreState,
  onCorrupt: () => void,
): StoreState {
  if (persisted === undefined || persisted === null) return current;
  const parsed = StoredStateSchema.safeParse(persisted);
  if (!parsed.success) {
    safeStorage.removeItem(STORAGE_KEY);
    onCorrupt();
    return current;
  }
  return { ...current, ...parsed.data };
}
