import { create } from 'zustand';
import type { RivalCareer } from '../types/relationships';
import { saveData, loadData } from '../database/gameRepository';
import { clamp } from '../utils/random';

interface RivalryStoreState {
  rivals: Record<string, RivalCareer>;
}

interface RivalryStoreActions {
  ensureRival: (artistId: string, fans: number, fameLevel: number) => void;
  updateRival: (artistId: string, patch: Partial<RivalCareer>) => void;
  adjustIntensity: (artistId: string, delta: number) => void;
  recordAction: (artistId: string, actionId: string) => void;
  getRival: (artistId: string) => RivalCareer | null;
  allRivals: () => RivalCareer[];
  hottestIntensity: () => number;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type RivalryStore = RivalryStoreState & RivalryStoreActions;

export const useRivalryStore = create<RivalryStore>((set, get) => ({
  rivals: {},

  ensureRival(artistId, fans, fameLevel) {
    if (get().rivals[artistId]) return;
    set({
      rivals: {
        ...get().rivals,
        [artistId]: {
          artistId,
          fans,
          momentum: 0,
          fameLevel,
          intensity: 0,
          storylineId: null,
          storylineStage: -1,
          lastActionWeek: 0,
          actionsTaken: [],
          legendary: false,
          dormant: false,
        },
      },
    });
  },

  updateRival(artistId, patch) {
    const r = get().rivals[artistId];
    if (!r) return;
    set({ rivals: { ...get().rivals, [artistId]: { ...r, ...patch } } });
  },

  adjustIntensity(artistId, delta) {
    const r = get().rivals[artistId];
    if (!r) return;
    const intensity = clamp(r.intensity + delta, 0, 100);
    set({
      rivals: {
        ...get().rivals,
        [artistId]: {
          ...r,
          intensity,
          dormant: intensity < 10,
          legendary: r.legendary || intensity >= 90,
        },
      },
    });
  },

  recordAction(artistId, actionId) {
    const r = get().rivals[artistId];
    if (!r) return;
    set({
      rivals: {
        ...get().rivals,
        [artistId]: {
          ...r,
          actionsTaken: [...r.actionsTaken, actionId].slice(-20),
        },
      },
    });
  },

  getRival(artistId) {
    return get().rivals[artistId] ?? null;
  },

  allRivals() {
    return Object.values(get().rivals);
  },

  hottestIntensity() {
    const all = Object.values(get().rivals);
    return all.length ? Math.max(...all.map((r) => r.intensity)) : 0;
  },

  save() {
    saveData('rivalry', { rivals: get().rivals });
  },

  load() {
    const saved = loadData<RivalryStoreState>('rivalry');
    if (saved) set({ rivals: saved.rivals ?? {} });
  },

  reset() {
    set({ rivals: {} });
  },
}));
