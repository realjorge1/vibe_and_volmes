import { create } from 'zustand';
import type { LegalCase, LegalRecord } from '../types/legal';
import { saveData, loadData } from '../database/gameRepository';

/** The open case (if any) and the artist's record. */

interface LegalState {
  activeCase: LegalCase | null;
  record: LegalRecord[];
}

interface LegalActions {
  setCase: (c: LegalCase | null) => void;
  patchCase: (p: Partial<LegalCase>) => void;
  addRecord: (r: LegalRecord) => void;
  inJail: () => boolean;
  save: () => void;
  load: () => void;
  reset: () => void;
}

const DEFAULT_STATE: LegalState = { activeCase: null, record: [] };

const SAVE_KEY = 'legal';

export const useLegalStore = create<LegalState & LegalActions>((set, get) => ({
  ...DEFAULT_STATE,

  setCase(activeCase) {
    set({ activeCase });
  },

  patchCase(p) {
    const c = get().activeCase;
    if (c) set({ activeCase: { ...c, ...p } });
  },

  addRecord(r) {
    set({ record: [r, ...get().record].slice(0, 20) });
  },

  inJail() {
    return get().activeCase?.stage === 'jailed';
  },

  save() {
    const { activeCase, record } = get();
    saveData(SAVE_KEY, { activeCase, record });
  },

  load() {
    const saved = loadData<Partial<LegalState>>(SAVE_KEY);
    if (saved) set({ ...DEFAULT_STATE, ...saved });
  },

  reset() {
    set({ ...DEFAULT_STATE });
  },
}));
