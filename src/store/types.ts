import type { StateCreator } from 'zustand';
import type {
  BudgetLine,
  CelebrationEvent,
  ChecklistItem,
  Guest,
  Helper,
  PersistedState,
  PrepTask,
  RunSheet,
  Rsvp,
  Vendor,
  Version,
} from '../shared/schemas';

/** One entry in the session RSVP change log (F4). Not persisted: it describes this session only. */
export type ChangeLogEntry = { at: string; text: string };

export type PlanSlice = {
  event?: CelebrationEvent;
  maybeProbability: number;
  quantityOverrides: Record<string, number>;
  setEvent: (event: CelebrationEvent) => void;
  setMaybeProbability: (p: number) => void;
  setQuantityOverride: (item: string, amount: number | undefined) => void;
};

export type GuestSlice = {
  guests: Guest[];
  changeLog: ChangeLogEntry[];
  addGuests: (guests: Guest[]) => void;
  updateGuest: (id: string, patch: Partial<Omit<Guest, 'id'>>) => void;
  removeGuest: (id: string) => void;
  setRsvp: (ids: string[], rsvp: Rsvp) => void;
  logChange: (text: string) => void;
};

export type BudgetSlice = {
  budget: BudgetLine[];
  setBudget: (lines: BudgetLine[]) => void;
  upsertBudgetLine: (line: BudgetLine) => void;
  removeBudgetLine: (id: string) => void;
};

export type VendorSlice = {
  vendors: Vendor[];
  upsertVendor: (vendor: Vendor) => void;
  removeVendor: (id: string) => void;
};

export type HelperSlice = {
  helpers: Helper[];
  upsertHelper: (helper: Helper) => void;
  removeHelper: (id: string) => void;
};

export type TaskSlice = {
  tasks: PrepTask[];
  setTasks: (tasks: PrepTask[]) => void;
  updateTask: (id: string, patch: Partial<Omit<PrepTask, 'id'>>) => void;
};

export type RunSheetSlice = {
  runSheet?: RunSheet;
  setRunSheet: (runSheet: RunSheet | undefined) => void;
};

export type ChecklistSlice = {
  checklist: ChecklistItem[];
  setChecklist: (items: ChecklistItem[]) => void;
  toggleChecklistItem: (id: string) => void;
};

export type VersionSlice = {
  versions: Version[];
  snapshot: (reason: string) => void;
  restoreVersion: (id: string) => boolean;
};

export type RootActions = {
  loadDemo: () => void;
  deleteAllData: () => void;
  replaceState: (state: PersistedState) => void;
};

export type StoreState = PlanSlice &
  GuestSlice &
  BudgetSlice &
  VendorSlice &
  HelperSlice &
  TaskSlice &
  RunSheetSlice &
  ChecklistSlice &
  VersionSlice &
  RootActions;

export type SliceCreator<T> = StateCreator<StoreState, [['zustand/persist', unknown]], [], T>;
