import { create } from 'zustand';
import type { BeefWar, DmThread, Moment } from '../types/drama';
import { saveData, loadData } from '../database/gameRepository';

/**
 * The drama layer's memory: moments still burning (and the loud ones the
 * Chronicle keeps), every DM thread, and the state of each rival war.
 */
interface DramaState {
  moments: Moment[];
  /** Notable moments that burned out, newest first (capped). */
  archive: Moment[];
  dms: DmThread[];
  wars: Record<string, BeefWar>;
  /** arc id -> week it last started (arc cooldowns). */
  arcWeeks: Record<string, number>;
  /** Week the last romantic DM arrived (romance is rationed). */
  lastRomanceWeek: number;
  /** Players who answered a flirt while partnered (fuels leak events). */
  flirtedWhileTaken: number;
}

interface DramaActions {
  addMoment: (m: Moment) => void;
  setMoments: (ms: Moment[]) => void;
  updateMoment: (id: string, patch: Partial<Moment>) => void;
  archiveMoments: (ms: Moment[]) => void;
  upsertDm: (t: DmThread) => void;
  setDms: (ts: DmThread[]) => void;
  getDm: (id: string) => DmThread | undefined;
  markDmRead: (id: string) => void;
  setWar: (w: BeefWar) => void;
  noteArc: (arcId: string, week: number) => void;
  setLastRomanceWeek: (w: number) => void;
  bumpFlirt: () => void;
  unreadDms: (platform?: string) => number;
  save: () => void;
  load: () => void;
  reset: () => void;
}

const KEY = 'drama';
const MAX_DMS = 60;
const MAX_ARCHIVE = 40;

const initial: DramaState = {
  moments: [],
  archive: [],
  dms: [],
  wars: {},
  arcWeeks: {},
  lastRomanceWeek: -99,
  flirtedWhileTaken: 0,
};

export const useDramaStore = create<DramaState & DramaActions>((set, get) => ({
  ...initial,

  addMoment(m) {
    set({ moments: [m, ...get().moments.filter((x) => x.id !== m.id)] });
  },
  setMoments(ms) {
    set({ moments: ms });
  },
  updateMoment(id, patch) {
    set({ moments: get().moments.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  },
  archiveMoments(ms) {
    if (ms.length === 0) return;
    const ids = new Set(ms.map((m) => m.id));
    set({ archive: [...ms, ...get().archive.filter((m) => !ids.has(m.id))].slice(0, MAX_ARCHIVE) });
  },

  upsertDm(t) {
    const rest = get().dms.filter((d) => d.id !== t.id);
    set({ dms: [t, ...rest].slice(0, MAX_DMS) });
  },
  setDms(ts) {
    set({ dms: ts.slice(0, MAX_DMS) });
  },
  getDm(id) {
    return get().dms.find((d) => d.id === id);
  },
  markDmRead(id) {
    set({ dms: get().dms.map((d) => (d.id === id && d.unread ? { ...d, unread: false } : d)) });
  },

  setWar(w) {
    set({ wars: { ...get().wars, [w.rivalId]: w } });
  },
  noteArc(arcId, week) {
    set({ arcWeeks: { ...get().arcWeeks, [arcId]: week } });
  },
  setLastRomanceWeek(w) {
    set({ lastRomanceWeek: w });
  },
  bumpFlirt() {
    set({ flirtedWhileTaken: get().flirtedWhileTaken + 1 });
  },
  unreadDms(platform) {
    return get().dms.filter((d) => d.unread && d.state !== 'blocked' && (!platform || d.platform === platform)).length;
  },

  save() {
    const { moments, archive, dms, wars, arcWeeks, lastRomanceWeek, flirtedWhileTaken } = get();
    saveData(KEY, { moments, archive, dms, wars, arcWeeks, lastRomanceWeek, flirtedWhileTaken });
  },
  load() {
    const saved = loadData<Partial<DramaState>>(KEY);
    if (!saved) return;
    set({
      moments: saved.moments ?? [],
      archive: saved.archive ?? [],
      dms: saved.dms ?? [],
      wars: saved.wars ?? {},
      arcWeeks: saved.arcWeeks ?? {},
      lastRomanceWeek: saved.lastRomanceWeek ?? -99,
      flirtedWhileTaken: saved.flirtedWhileTaken ?? 0,
    });
  },
  reset() {
    set({ ...initial });
  },
}));
