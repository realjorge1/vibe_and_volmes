import { create } from 'zustand';
import type { SocialReactionType } from '../types/events';
import { saveData, loadData } from '../database/gameRepository';

/**
 * Bookkeeping for the Life tab's Activities: how many were done this week,
 * what they earned (for the weekly cap), per-activity cooldowns, and the
 * social reactions waiting to feed the next week transition.
 *
 * Weekly counters are keyed by `week` and read through `weekTally`, so they
 * reset themselves when the clock moves — nothing has to remember to clear
 * them.
 */

interface ActivityState {
  week: number;
  doneThisWeek: number;
  earnedThisWeek: number;
  /** activityId → week last done. */
  lastDone: Record<string, number>;
  /** Reactions from activities since the last week transition. */
  pendingReactions: SocialReactionType[];
  /** Story ids since the last transition (feed posts can reference them). */
  pendingStoryIds: string[];
}

interface ActivityActions {
  weekTally: (week: number) => { done: number; earned: number };
  record: (params: {
    activityId: string;
    week: number;
    earned: number;
    reaction: SocialReactionType;
  }) => void;
  /** Queue a reaction from outside the activity menu (people, …). */
  queueReaction: (reaction: SocialReactionType, storyId: string) => void;
  /** Hand the queued reactions to the week transition and clear them. */
  drainPending: () => { reactions: SocialReactionType[]; storyIds: string[] };
  save: () => void;
  load: () => void;
  reset: () => void;
}

const DEFAULT_STATE: ActivityState = {
  week: 0,
  doneThisWeek: 0,
  earnedThisWeek: 0,
  lastDone: {},
  pendingReactions: [],
  pendingStoryIds: [],
};

const SAVE_KEY = 'activities';

export const useActivityStore = create<ActivityState & ActivityActions>((set, get) => ({
  ...DEFAULT_STATE,

  weekTally(week) {
    const s = get();
    return s.week === week
      ? { done: s.doneThisWeek, earned: s.earnedThisWeek }
      : { done: 0, earned: 0 };
  },

  record({ activityId, week, earned, reaction }) {
    const tally = get().weekTally(week);
    const s = get();
    set({
      week,
      doneThisWeek: tally.done + 1,
      earnedThisWeek: tally.earned + earned,
      lastDone: { ...s.lastDone, [activityId]: week },
      pendingReactions:
        reaction === 'none' ? s.pendingReactions : [...s.pendingReactions, reaction],
      pendingStoryIds: [...s.pendingStoryIds, `activity:${activityId}`],
    });
  },

  queueReaction(reaction, storyId) {
    const s = get();
    set({
      pendingReactions:
        reaction === 'none' ? s.pendingReactions : [...s.pendingReactions, reaction],
      pendingStoryIds: [...s.pendingStoryIds, storyId],
    });
  },

  drainPending() {
    const { pendingReactions, pendingStoryIds } = get();
    set({ pendingReactions: [], pendingStoryIds: [] });
    return { reactions: pendingReactions, storyIds: pendingStoryIds };
  },

  save() {
    const { week, doneThisWeek, earnedThisWeek, lastDone, pendingReactions, pendingStoryIds } =
      get();
    saveData(SAVE_KEY, {
      week,
      doneThisWeek,
      earnedThisWeek,
      lastDone,
      pendingReactions,
      pendingStoryIds,
    });
  },

  load() {
    const saved = loadData<Partial<ActivityState>>(SAVE_KEY);
    if (saved) set({ ...DEFAULT_STATE, ...saved });
  },

  reset() {
    set({ ...DEFAULT_STATE });
  },
}));
