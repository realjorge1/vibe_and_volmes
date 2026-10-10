import { create } from 'zustand';
import type {
  ActiveDream,
  ActiveWant,
  ChallengeRun,
  ComebackState,
  DreamOffer,
  DreamRecord,
  Era,
  Seed,
  WantLogEntry,
} from '../types/identity';
import { saveData, loadData } from '../database/gameRepository';

/**
 * Who the artist is and what they want: wants and fears, the Dream, the
 * seeds of choices that will come back, eras, the comeback in progress, the
 * accepted challenge. Traits themselves live as `trait:<id>` tags in the game
 * store, so every event trigger and choice gate can read them for free.
 */

interface IdentityState {
  wants: ActiveWant[];
  wantLog: WantLogEntry[];
  /** Wants fulfilled this life (fears faced count too). */
  wantsMet: number;
  dream: ActiveDream | null;
  dreamOffer: DreamOffer | null;
  dreamLog: DreamRecord[];
  seeds: Seed[];
  /** Seeds that paid off this life. */
  callbacksPaid: number;
  eras: Era[];
  currentEraId: string | null;
  comeback: ComebackState | null;
  challenge: ChallengeRun | null;
  scenarioId: string | null;
  /** Traits earned this life, with when and how. */
  traitLog: { week: number; trait: string; line: string }[];
}

interface IdentityActions {
  setWants: (wants: ActiveWant[]) => void;
  logWant: (entry: WantLogEntry) => void;
  setDream: (dream: ActiveDream | null) => void;
  setDreamOffer: (offer: DreamOffer | null) => void;
  logDream: (record: DreamRecord) => void;
  addSeed: (seed: Seed) => void;
  removeSeed: (id: string, paid: boolean) => void;
  setSeeds: (seeds: Seed[]) => void;
  addEra: (era: Era) => void;
  updateEra: (id: string, patch: Partial<Era>) => void;
  currentEra: () => Era | null;
  setComeback: (c: ComebackState | null) => void;
  setChallenge: (c: ChallengeRun | null) => void;
  setScenario: (id: string | null) => void;
  logTrait: (week: number, trait: string, line: string) => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

const DEFAULT_STATE: IdentityState = {
  wants: [],
  wantLog: [],
  wantsMet: 0,
  dream: null,
  dreamOffer: null,
  dreamLog: [],
  seeds: [],
  callbacksPaid: 0,
  eras: [],
  currentEraId: null,
  comeback: null,
  challenge: null,
  scenarioId: null,
  traitLog: [],
};

const SAVE_KEY = 'identity';

export const useIdentityStore = create<IdentityState & IdentityActions>((set, get) => ({
  ...DEFAULT_STATE,

  setWants(wants) {
    set({ wants });
  },

  logWant(entry) {
    const met = entry.outcome === 'met' || entry.outcome === 'faced';
    set({
      wantLog: [entry, ...get().wantLog].slice(0, 40),
      wantsMet: get().wantsMet + (met ? 1 : 0),
    });
  },

  setDream(dream) {
    set({ dream });
  },

  setDreamOffer(dreamOffer) {
    set({ dreamOffer });
  },

  logDream(record) {
    set({ dreamLog: [record, ...get().dreamLog].slice(0, 20) });
  },

  addSeed(seed) {
    set({ seeds: [...get().seeds, seed].slice(-40) });
  },

  removeSeed(id, paid) {
    set({
      seeds: get().seeds.filter((s) => s.id !== id),
      callbacksPaid: get().callbacksPaid + (paid ? 1 : 0),
    });
  },

  setSeeds(seeds) {
    set({ seeds });
  },

  addEra(era) {
    set({ eras: [...get().eras, era], currentEraId: era.id });
  },

  updateEra(id, patch) {
    set({ eras: get().eras.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  },

  currentEra() {
    const { eras, currentEraId } = get();
    return eras.find((e) => e.id === currentEraId) ?? null;
  },

  setComeback(comeback) {
    set({ comeback });
  },

  setChallenge(challenge) {
    set({ challenge });
  },

  setScenario(scenarioId) {
    set({ scenarioId });
  },

  logTrait(week, trait, line) {
    set({ traitLog: [{ week, trait, line }, ...get().traitLog].slice(0, 30) });
  },

  save() {
    const s = get();
    saveData(SAVE_KEY, {
      wants: s.wants,
      wantLog: s.wantLog,
      wantsMet: s.wantsMet,
      dream: s.dream,
      dreamOffer: s.dreamOffer,
      dreamLog: s.dreamLog,
      seeds: s.seeds,
      callbacksPaid: s.callbacksPaid,
      eras: s.eras,
      currentEraId: s.currentEraId,
      comeback: s.comeback,
      challenge: s.challenge,
      scenarioId: s.scenarioId,
      traitLog: s.traitLog,
    });
  },

  load() {
    const saved = loadData<Partial<IdentityState>>(SAVE_KEY);
    if (saved) set({ ...DEFAULT_STATE, ...saved });
  },

  reset() {
    set({ ...DEFAULT_STATE });
  },
}));
