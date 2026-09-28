import { create } from 'zustand';
import type { PendingBirth, Person } from '../types/people';
import { saveData, loadData } from '../database/gameRepository';
import { clampAffinity } from '../systems/life/peopleEngine';

/**
 * The artist's personal circle. The store only holds state and applies
 * changes it is handed; the rules live in systems/life/peopleEngine.ts and
 * the weekly tick in systems/life/peopleTick.ts.
 */

interface PeopleState {
  people: Person[];
  pendingBirth: PendingBirth | null;
  /** Money people handed over in `giftWeek` (for the weekly cap). */
  giftWeek: number;
  giftedThisWeek: number;
}

interface PeopleActions {
  setPeople: (people: Person[]) => void;
  addPerson: (person: Person) => void;
  get: (id: string) => Person | undefined;
  adjustAffinity: (id: string, delta: number) => void;
  /** Mark that the artist made time for them this week. */
  markSeen: (id: string, week: number) => void;
  setPendingBirth: (birth: PendingBirth | null) => void;
  giftedIn: (week: number) => number;
  recordGift: (week: number, amount: number) => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

const DEFAULT_STATE: PeopleState = {
  people: [],
  pendingBirth: null,
  giftWeek: 0,
  giftedThisWeek: 0,
};

const SAVE_KEY = 'people';

export const usePeopleStore = create<PeopleState & PeopleActions>((set, get) => ({
  ...DEFAULT_STATE,

  setPeople(people) {
    set({ people });
  },

  addPerson(person) {
    set({ people: [...get().people, person] });
  },

  get(id) {
    return get().people.find((p) => p.id === id);
  },

  adjustAffinity(id, delta) {
    set({
      people: get().people.map((p) =>
        p.id === id ? { ...p, affinity: clampAffinity(p.affinity + delta) } : p
      ),
    });
  },

  markSeen(id, week) {
    set({
      people: get().people.map((p) =>
        p.id === id ? { ...p, lastSeenWeek: week, lastInteractionWeek: week } : p
      ),
    });
  },

  setPendingBirth(birth) {
    set({ pendingBirth: birth });
  },

  giftedIn(week) {
    const s = get();
    return s.giftWeek === week ? s.giftedThisWeek : 0;
  },

  recordGift(week, amount) {
    set({ giftWeek: week, giftedThisWeek: get().giftedIn(week) + amount });
  },

  save() {
    const { people, pendingBirth, giftWeek, giftedThisWeek } = get();
    saveData(SAVE_KEY, { people, pendingBirth, giftWeek, giftedThisWeek });
  },

  load() {
    const saved = loadData<Partial<PeopleState>>(SAVE_KEY);
    if (saved) set({ ...DEFAULT_STATE, ...saved });
  },

  reset() {
    set({ ...DEFAULT_STATE });
  },
}));
