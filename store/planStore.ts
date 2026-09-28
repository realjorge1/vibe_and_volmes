import { create } from 'zustand';
import type { DayPlan, ActivityId, Storyline } from '../types/passive';
import { PASSIVE_CONFIG } from '../constants/passiveConfig';
import { saveData, loadData } from '../database/gameRepository';

/**
 * The daily-plan store. Holds the player's repeating activity schedule, the
 * wall-clock baseline the away sim resolves from, and any in-flight curiosity
 * storylines. Per-save (save key 'plan'); resolves are applied by the live
 * tick, not here — this store is pure plan state.
 */

const now = () => Date.now();

function clampToSlots(slots: (ActivityId | null)[]): (ActivityId | null)[] {
  const out = slots.slice(0, PASSIVE_CONFIG.SLOTS_PER_DAY);
  while (out.length < PASSIVE_CONFIG.SLOTS_PER_DAY) out.push(null);
  return out;
}

/** A balanced starter routine so a brand-new career still has a living plan. */
function defaultPlan(): DayPlan {
  return {
    slots: clampToSlots(['studio', 'social', 'fitness', 'rest']),
    updatedAt: now(),
  };
}

/** The auto-fill (premium convenience) routine — balanced across grind/recover. */
const AUTO_ROUTINE: ActivityId[] = ['studio', 'promotion', 'networking', 'rest'];

interface PlanState {
  plan: DayPlan;
  /** Wall-clock ms the plan was last resolved into outcomes. */
  lastResolvedAt: number;
  storylines: Storyline[];
}

interface PlanActions {
  setSlot: (index: number, activity: ActivityId | null) => void;
  clearSlot: (index: number) => void;
  setPlan: (slots: (ActivityId | null)[]) => void;
  autoFill: () => void;
  markResolved: (ts?: number) => void;
  setStorylines: (s: Storyline[]) => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type PlanStore = PlanState & PlanActions;

export const usePlanStore = create<PlanStore>((set, get) => ({
  plan: defaultPlan(),
  lastResolvedAt: now(),
  storylines: [],

  setSlot(index, activity) {
    const slots = [...get().plan.slots];
    if (index < 0 || index >= slots.length) return;
    slots[index] = activity;
    set({ plan: { slots, updatedAt: now() } });
  },

  clearSlot(index) {
    get().setSlot(index, null);
  },

  setPlan(slots) {
    set({ plan: { slots: clampToSlots(slots), updatedAt: now() } });
  },

  autoFill() {
    set({ plan: { slots: clampToSlots(AUTO_ROUTINE), updatedAt: now() } });
  },

  markResolved(ts) {
    set({ lastResolvedAt: ts ?? now() });
  },

  setStorylines(s) {
    set({ storylines: s });
  },

  save() {
    const { plan, lastResolvedAt, storylines } = get();
    saveData('plan', { plan, lastResolvedAt, storylines });
  },

  load() {
    const saved = loadData<PlanState>('plan');
    if (saved) {
      set({
        plan: saved.plan
          ? { slots: clampToSlots(saved.plan.slots), updatedAt: saved.plan.updatedAt }
          : defaultPlan(),
        lastResolvedAt: saved.lastResolvedAt ?? now(),
        storylines: saved.storylines ?? [],
      });
    }
  },

  reset() {
    set({ plan: defaultPlan(), lastResolvedAt: now(), storylines: [] });
  },
}));
