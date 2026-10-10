import { create } from 'zustand';
import type { OwnLabel, Signee, Venture } from '../types/mogul';
import { saveData, loadData } from '../database/gameRepository';

/** The artist's own label, its roster, scouting, and their businesses. */

interface MogulState {
  label: OwnLabel | null;
  roster: Signee[];
  /** World NPC ids worth signing, refreshed every few weeks. */
  scouting: { week: number; npcIds: string[] } | null;
  ventures: Venture[];
}

interface MogulActions {
  setLabel: (l: OwnLabel | null) => void;
  patchLabel: (p: Partial<OwnLabel>) => void;
  addSignee: (s: Signee) => void;
  patchSignee: (npcId: string, p: Partial<Signee>) => void;
  activeRoster: () => Signee[];
  setScouting: (s: MogulState['scouting']) => void;
  addVenture: (v: Venture) => void;
  patchVenture: (id: string, p: Partial<Venture>) => void;
  runningVentures: () => Venture[];
  save: () => void;
  load: () => void;
  reset: () => void;
}

const DEFAULT_STATE: MogulState = { label: null, roster: [], scouting: null, ventures: [] };

const SAVE_KEY = 'mogul';

export const useMogulStore = create<MogulState & MogulActions>((set, get) => ({
  ...DEFAULT_STATE,

  setLabel(label) {
    set({ label });
  },

  patchLabel(p) {
    const l = get().label;
    if (l) set({ label: { ...l, ...p } });
  },

  addSignee(s) {
    set({ roster: [...get().roster.filter((r) => r.npcId !== s.npcId), s] });
  },

  patchSignee(npcId, p) {
    set({ roster: get().roster.map((r) => (r.npcId === npcId ? { ...r, ...p } : r)) });
  },

  activeRoster() {
    return get().roster.filter((r) => r.status === 'active');
  },

  setScouting(scouting) {
    set({ scouting });
  },

  addVenture(v) {
    set({ ventures: [...get().ventures, v] });
  },

  patchVenture(id, p) {
    set({ ventures: get().ventures.map((v) => (v.id === id ? { ...v, ...p } : v)) });
  },

  runningVentures() {
    return get().ventures.filter((v) => v.status === 'running');
  },

  save() {
    const { label, roster, scouting, ventures } = get();
    saveData(SAVE_KEY, { label, roster, scouting, ventures });
  },

  load() {
    const saved = loadData<Partial<MogulState>>(SAVE_KEY);
    if (saved) set({ ...DEFAULT_STATE, ...saved });
  },

  reset() {
    set({ ...DEFAULT_STATE });
  },
}));
