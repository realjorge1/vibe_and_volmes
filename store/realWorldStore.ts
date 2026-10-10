import { create } from 'zustand';
import type { RealTopic } from '../types/realworld';
import { saveData, loadData } from '../database/gameRepository';

/**
 * The real-world stories the apps' everyday internet talks about, as last
 * fetched (systems/realworld/refresh), kept so the feeds have them offline
 * too. Not part of a career: it outlives retirements.
 */

interface RealWorldState {
  topics: RealTopic[];
  /** When they were fetched (ms), 0 = never. */
  fetchedAt: number;
  /** The player's country, as the phone's time zone tells it ('NG', 'GB', 'US'...). */
  region: string;
  loaded: boolean;
}

interface RealWorldActions {
  setTopics: (topics: RealTopic[], at: number, region: string) => void;
  load: () => void;
}

const KEY = 'realWorld';

export const useRealWorldStore = create<RealWorldState & RealWorldActions>((set, get) => ({
  topics: [],
  fetchedAt: 0,
  region: 'US',
  loaded: false,

  setTopics(topics, at, region) {
    set({ topics, fetchedAt: at, region, loaded: true });
    try {
      saveData(KEY, { topics, fetchedAt: at, region });
    } catch {
      /* the cache is a nice-to-have */
    }
  },

  load() {
    if (get().loaded) return;
    try {
      const saved = loadData<{ topics: RealTopic[]; fetchedAt: number; region: string }>(KEY);
      set({ topics: saved?.topics ?? [], fetchedAt: saved?.fetchedAt ?? 0, region: saved?.region ?? 'US', loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
