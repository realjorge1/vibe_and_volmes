import { create } from 'zustand';
import type {
  GlobalChartEntry,
  SeasonalRank,
  CommunityEventDef,
} from '../types/sync';
import { saveData, loadData } from '../database/gameRepository';

/**
 * Caches the latest anonymous community snapshot (global charts, the player's
 * seasonal standing, active community events). Per-save (save key 'community').
 * The data is always re-fetchable from the offline-first sync adapter; this
 * store just avoids recomputing it on every screen open and lets the planner /
 * recap read active events without an async call.
 */

interface CommunityState {
  charts: GlobalChartEntry[];
  rank: SeasonalRank | null;
  events: CommunityEventDef[];
  lastFetchedAt: number;
}

interface CommunityActions {
  setSnapshot: (s: {
    charts: GlobalChartEntry[];
    rank: SeasonalRank | null;
    events: CommunityEventDef[];
  }) => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type CommunityStore = CommunityState & CommunityActions;

const INITIAL: CommunityState = {
  charts: [],
  rank: null,
  events: [],
  lastFetchedAt: 0,
};

export const useCommunityStore = create<CommunityStore>((set, get) => ({
  ...INITIAL,

  setSnapshot(s) {
    set({
      charts: s.charts,
      rank: s.rank,
      events: s.events,
      lastFetchedAt: Date.now(),
    });
    get().save();
  },

  save() {
    const { charts, rank, events, lastFetchedAt } = get();
    saveData('community', { charts, rank, events, lastFetchedAt });
  },

  load() {
    const saved = loadData<CommunityState>('community');
    if (saved) {
      set({
        charts: saved.charts ?? [],
        rank: saved.rank ?? null,
        events: saved.events ?? [],
        lastFetchedAt: saved.lastFetchedAt ?? 0,
      });
    }
  },

  reset() {
    set({ ...INITIAL });
  },
}));
