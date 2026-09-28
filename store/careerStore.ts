import { create } from 'zustand';
import type {
  CareerArcState,
  EconomyState,
  HistoryRecord,
  LedgerEntry,
  MentalState,
} from '../types/industry';
import { saveData, loadData } from '../database/gameRepository';
import { clamp } from '../utils/random';

interface CareerStoreState {
  arc: CareerArcState;
  mental: MentalState;
  economy: EconomyState;
  history: HistoryRecord[];
}

interface CareerStoreActions {
  setArc: (arc: Partial<CareerArcState>) => void;
  adjustMental: (deltas: Partial<MentalState>) => void;
  setInTreatment: (v: boolean) => void;
  setLastCrisisWeek: (week: number) => void;
  recordLedger: (entry: LedgerEntry) => void;
  setEconomy: (e: Partial<EconomyState>) => void;
  addHistory: (record: HistoryRecord) => void;
  markResurfaced: (id: string) => void;
  buryHistory: (id: string) => void;
  recentHistory: (limit?: number) => HistoryRecord[];
  save: () => void;
  load: () => void;
  reset: () => void;
}

type CareerStore = CareerStoreState & CareerStoreActions;

const DEFAULT_MENTAL: MentalState = {
  burnout: 10,
  anxiety: 10,
  paranoia: 5,
  depression: 5,
  addictionRisk: 5,
  isolation: 10,
  inTreatment: false,
  lastCrisisWeek: null,
};

const DEFAULT_ARC: CareerArcState = {
  phase: 'come-up',
  phaseStartedWeek: 1,
  momentum: 0,
  peakFans: 0,
  peakWeek: 1,
  comebackCount: 0,
  weeksSincePeak: 0,
};

const DEFAULT_ECONOMY: EconomyState = {
  netWorth: 0,
  debt: 0,
  lifestyleTier: 1,
  weeklyBurn: 500,
  taxRatePct: 25,
  ledger: [],
  lifetimeEarnings: 0,
};

const DEFAULT: CareerStoreState = {
  arc: DEFAULT_ARC,
  mental: DEFAULT_MENTAL,
  economy: DEFAULT_ECONOMY,
  history: [],
};

const MENTAL_KEYS: (keyof MentalState)[] = [
  'burnout',
  'anxiety',
  'paranoia',
  'depression',
  'addictionRisk',
  'isolation',
];

export const useCareerStore = create<CareerStore>((set, get) => ({
  ...DEFAULT,

  setArc(arc) {
    set({ arc: { ...get().arc, ...arc } });
  },

  adjustMental(deltas) {
    const mental = { ...get().mental };
    for (const key of MENTAL_KEYS) {
      const d = deltas[key];
      if (typeof d === 'number') {
        mental[key] = clamp((mental[key] as number) + d, 0, 100) as never;
      }
    }
    set({ mental });
  },

  setInTreatment(v) {
    set({ mental: { ...get().mental, inTreatment: v } });
  },

  setLastCrisisWeek(week) {
    set({ mental: { ...get().mental, lastCrisisWeek: week } });
  },

  recordLedger(entry) {
    const { economy } = get();
    set({
      economy: {
        ...economy,
        ledger: [entry, ...economy.ledger].slice(0, 60),
        lifetimeEarnings:
          economy.lifetimeEarnings + (entry.amount > 0 ? entry.amount : 0),
      },
    });
  },

  setEconomy(e) {
    set({ economy: { ...get().economy, ...e } });
  },

  addHistory(record) {
    set({ history: [record, ...get().history].slice(0, 80) });
  },

  markResurfaced(id) {
    set({
      history: get().history.map((h) =>
        h.id === id ? { ...h, resurfacedCount: h.resurfacedCount + 1 } : h
      ),
    });
  },

  buryHistory(id) {
    set({
      history: get().history.map((h) =>
        h.id === id ? { ...h, buried: true } : h
      ),
    });
  },

  recentHistory(limit = 15) {
    return get().history.slice(0, limit);
  },

  save() {
    const s = get();
    saveData('career', {
      arc: s.arc,
      mental: s.mental,
      economy: s.economy,
      history: s.history,
    });
  },

  load() {
    const saved = loadData<CareerStoreState>('career');
    if (saved) {
      set({
        arc: { ...DEFAULT_ARC, ...saved.arc },
        mental: { ...DEFAULT_MENTAL, ...saved.mental },
        economy: { ...DEFAULT_ECONOMY, ...saved.economy },
        history: saved.history ?? [],
      });
    }
  },

  reset() {
    set({
      arc: { ...DEFAULT_ARC },
      mental: { ...DEFAULT_MENTAL },
      economy: { ...DEFAULT_ECONOMY },
      history: [],
    });
  },
}));
