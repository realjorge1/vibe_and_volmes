import { create } from 'zustand';
import type { LiveNotification, AwayReport } from '../types/progression';
import { LIVE_CONFIG } from '../constants/liveConfig';
import { saveData, loadData } from '../database/gameRepository';

interface LiveState {
  /** Wall-clock ms the app was last seen (resume baseline). */
  lastSeenAt: number;
  /** Wall-clock ms energy was last reconciled. */
  energyUpdatedAt: number;
  /** The current unviewed "while you were away" digest, if any. */
  awayReport: AwayReport | null;
  /** Active toast stack (most recent last). */
  notifications: LiveNotification[];
}

interface LiveActions {
  pushNotification: (
    n: Omit<LiveNotification, 'id' | 'at'>
  ) => void;
  dismissNotification: (id: string) => void;
  setAwayReport: (r: AwayReport | null) => void;
  markSeen: (now?: number) => void;
  setEnergyUpdatedAt: (ts: number) => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type LiveStore = LiveState & LiveActions;

const now = () => Date.now();

export const useLiveStore = create<LiveStore>((set, get) => ({
  lastSeenAt: now(),
  energyUpdatedAt: now(),
  awayReport: null,
  notifications: [],

  pushNotification(n) {
    const note: LiveNotification = {
      ...n,
      id: `n-${now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: now(),
    };
    set({
      notifications: [...get().notifications, note].slice(
        -LIVE_CONFIG.NOTIFICATION_MAX
      ),
    });
  },

  dismissNotification(id) {
    set({ notifications: get().notifications.filter((n) => n.id !== id) });
  },

  setAwayReport(r) {
    set({ awayReport: r });
  },

  markSeen(ts) {
    set({ lastSeenAt: ts ?? now() });
  },

  setEnergyUpdatedAt(ts) {
    set({ energyUpdatedAt: ts });
  },

  save() {
    const { lastSeenAt, energyUpdatedAt } = get();
    saveData('live', { lastSeenAt, energyUpdatedAt });
  },

  load() {
    const saved = loadData<{ lastSeenAt: number; energyUpdatedAt: number }>(
      'live'
    );
    if (saved) {
      set({
        lastSeenAt: saved.lastSeenAt ?? now(),
        energyUpdatedAt: saved.energyUpdatedAt ?? now(),
      });
    }
  },

  reset() {
    set({
      lastSeenAt: now(),
      energyUpdatedAt: now(),
      awayReport: null,
      notifications: [],
    });
  },
}));
