import { create } from 'zustand';
import type {
  ActiveControversy,
  InterviewSession,
  PRStrategyId,
} from '../types/industry';
import { saveData, loadData } from '../database/gameRepository';
import { clamp } from '../utils/random';

interface PressStoreState {
  pendingInterview: InterviewSession | null;
  interviewHistory: InterviewSession[];
  controversies: ActiveControversy[];   // active + recently resolved
  hasPRTeam: boolean;
}

interface PressStoreActions {
  setPendingInterview: (session: InterviewSession | null) => void;
  archiveInterview: (session: InterviewSession) => void;
  addControversy: (c: ActiveControversy) => void;
  adjustHeat: (instanceId: string, delta: number) => void;
  applyStrategy: (instanceId: string, strategy: PRStrategyId) => void;
  resolveControversy: (
    instanceId: string,
    outcome: ActiveControversy['outcome'],
    week: number
  ) => void;
  pruneResolved: () => void;
  activeControversies: () => ActiveControversy[];
  hirePRTeam: () => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type PressStore = PressStoreState & PressStoreActions;

const DEFAULT: PressStoreState = {
  pendingInterview: null,
  interviewHistory: [],
  controversies: [],
  hasPRTeam: false,
};

export const usePressStore = create<PressStore>((set, get) => ({
  ...DEFAULT,

  setPendingInterview(session) {
    set({ pendingInterview: session });
  },

  archiveInterview(session) {
    set({
      pendingInterview: null,
      interviewHistory: [session, ...get().interviewHistory].slice(0, 20),
    });
  },

  addControversy(c) {
    set({ controversies: [...get().controversies, c] });
  },

  adjustHeat(instanceId, delta) {
    set({
      controversies: get().controversies.map((c) =>
        c.instanceId === instanceId
          ? { ...c, heat: clamp(c.heat + delta, 0, 100) }
          : c
      ),
    });
  },

  applyStrategy(instanceId, strategy) {
    set({
      controversies: get().controversies.map((c) =>
        c.instanceId === instanceId ? { ...c, strategyApplied: strategy } : c
      ),
    });
  },

  resolveControversy(instanceId, outcome, week) {
    set({
      controversies: get().controversies.map((c) =>
        c.instanceId === instanceId
          ? { ...c, resolved: true, outcome, resolutionWeek: week }
          : c
      ),
    });
  },

  pruneResolved() {
    // keep last 12 resolved for history/resurfacing, drop older
    const all = get().controversies;
    const active = all.filter((c) => !c.resolved);
    const resolved = all.filter((c) => c.resolved).slice(-12);
    set({ controversies: [...active, ...resolved] });
  },

  activeControversies() {
    return get().controversies.filter((c) => !c.resolved);
  },

  hirePRTeam() {
    set({ hasPRTeam: true });
  },

  save() {
    const s = get();
    saveData('press', {
      pendingInterview: s.pendingInterview,
      interviewHistory: s.interviewHistory,
      controversies: s.controversies,
      hasPRTeam: s.hasPRTeam,
    });
  },

  load() {
    const saved = loadData<PressStoreState>('press');
    if (saved) {
      set({
        pendingInterview: saved.pendingInterview ?? null,
        interviewHistory: saved.interviewHistory ?? [],
        controversies: saved.controversies ?? [],
        hasPRTeam: saved.hasPRTeam ?? false,
      });
    }
  },

  reset() {
    set({ ...DEFAULT });
  },
}));
