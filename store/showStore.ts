import { create } from 'zustand';
import type { GigBooking, ShowRecord } from '../types/show';
import { saveData, loadData } from '../database/gameRepository';

/** Live shows: a booked club gig, and every night the artist played. */

interface ShowState {
  gig: GigBooking | null;
  history: ShowRecord[];
}

interface ShowActions {
  setGig: (g: GigBooking | null) => void;
  addRecord: (r: ShowRecord) => void;
  played: (key: string) => ShowRecord | undefined;
  save: () => void;
  load: () => void;
  reset: () => void;
}

const DEFAULT_STATE: ShowState = { gig: null, history: [] };

const SAVE_KEY = 'shows';

export const useShowStore = create<ShowState & ShowActions>((set, get) => ({
  ...DEFAULT_STATE,

  setGig(gig) {
    set({ gig });
  },

  addRecord(r) {
    set({ history: [r, ...get().history.filter((h) => h.key !== r.key)].slice(0, 40) });
  },

  played(key) {
    return get().history.find((h) => h.key === key);
  },

  save() {
    const { gig, history } = get();
    saveData(SAVE_KEY, { gig, history });
  },

  load() {
    const saved = loadData<Partial<ShowState>>(SAVE_KEY);
    if (saved) set({ ...DEFAULT_STATE, ...saved });
  },

  reset() {
    set({ ...DEFAULT_STATE });
  },
}));
