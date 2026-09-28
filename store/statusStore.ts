import { create } from 'zustand';
import type { OwnedLuxury } from '../types/status';
import { getLuxuryItem } from '../data/luxury/catalog';
import { saveData, loadData } from '../database/gameRepository';

interface StatusState {
  owned: OwnedLuxury[];
  totalSpent: number;
}

interface StatusActions {
  addOwned: (o: OwnedLuxury) => void;
  ownsItem: (itemId: string) => boolean;
  /** Pure status score = sum of owned item status values. */
  statusScore: () => number;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type StatusStore = StatusState & StatusActions;

export const useStatusStore = create<StatusStore>((set, get) => ({
  owned: [],
  totalSpent: 0,

  addOwned(o) {
    set((s) => ({
      owned: [o, ...s.owned],
      totalSpent: s.totalSpent + o.boughtAtCost,
    }));
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

  save() {
    const { owned, totalSpent } = get();
    saveData('status', { owned, totalSpent });
  },

  load() {
    const saved = loadData<StatusState>('status');
    if (saved) {
      set({ owned: saved.owned ?? [], totalSpent: saved.totalSpent ?? 0 });
    }
  },

  reset() {
    set({ owned: [], totalSpent: 0 });
  },
}));
