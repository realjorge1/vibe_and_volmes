import { create } from 'zustand';
import type { HomeId, OwnedLuxury } from '../types/status';
import { getLuxuryItem } from '../data/luxury/catalog';
import { saveData, loadData } from '../database/gameRepository';

interface StatusState {
  owned: OwnedLuxury[];
  totalSpent: number;
  /** Where the artist lives. Null until the career's first week sets it. */
  homeId: HomeId | null;
}

interface StatusActions {
  addOwned: (o: OwnedLuxury) => void;
  /** Lose an item (stolen, repossessed, sold). */
  removeOwned: (itemId: string) => OwnedLuxury | undefined;
  ownsItem: (itemId: string) => boolean;
  /** Pure status score = sum of owned item status values. */
  statusScore: () => number;
  setHome: (id: HomeId) => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type StatusStore = StatusState & StatusActions;

export const useStatusStore = create<StatusStore>((set, get) => ({
  owned: [],
  totalSpent: 0,
  homeId: null,

  addOwned(o) {
    set((s) => ({
      owned: [o, ...s.owned],
      totalSpent: s.totalSpent + o.boughtAtCost,
    }));
  },

  removeOwned(itemId) {
    const lost = get().owned.find((o) => o.itemId === itemId);
    if (lost) set({ owned: get().owned.filter((o) => o.itemId !== itemId) });
    return lost;
  },

  ownsItem(itemId) {
    return get().owned.some((o) => o.itemId === itemId);
  },

  statusScore() {
    return get().owned.reduce((sum, o) => {
      const item = getLuxuryItem(o.itemId);
      return sum + (item?.statusValue ?? 0);
    }, 0);
  },

  setHome(id) {
    set({ homeId: id });
  },

  save() {
    const { owned, totalSpent, homeId } = get();
    saveData('status', { owned, totalSpent, homeId });
  },

  load() {
    const saved = loadData<Partial<StatusState>>('status');
    if (saved) {
      set({
        owned: saved.owned ?? [],
        totalSpent: saved.totalSpent ?? 0,
        homeId: saved.homeId ?? null,
      });
    }
  },

  reset() {
    set({ owned: [], totalSpent: 0, homeId: null });
  },
}));
