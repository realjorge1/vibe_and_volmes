import { create } from 'zustand';
import type {
  XpGrant,
  XpSource,
  LevelUpResult,
  Achievement,
  AchievementSnapshot,
} from '../types/progression';
import { levelForXp, levelInfo } from '../constants/progression';
import { ACHIEVEMENTS } from '../data/progression/achievements';
import { saveData, loadData } from '../database/gameRepository';

interface ProgressionState {
  xp: number;
  level: number;
  unlockedAchievements: string[];
  /** Recent grants for the floating "+XP" UI (most-recent first, capped). */
  recentGrants: XpGrant[];
}

interface ProgressionActions {
  /**
   * Award XP. Returns any level-ups crossed so the caller can fire the
   * dopamine burst. Pure bookkeeping — never touches the sim.
   */
  grantXp: (source: XpSource, amount: number, label: string) => LevelUpResult[];
  /** Evaluate data-driven achievements; returns the NEWLY unlocked ones. */
  evaluateAchievements: (snap: AchievementSnapshot) => Achievement[];
  clearRecentGrants: () => void;
  save: () => void;
  load: () => void;
  reset: () => void;
}

type ProgressionStore = ProgressionState & ProgressionActions;

const INITIAL: ProgressionState = {
  xp: 0,
  level: 1,
  unlockedAchievements: [],
  recentGrants: [],
};

export const useProgressionStore = create<ProgressionStore>((set, get) => ({
  ...INITIAL,

  grantXp(source, amount, label) {
    const amt = Math.max(0, Math.round(amount));
    if (amt === 0) return [];
    const prevXp = get().xp;
    const prevLevel = get().level;
    const xp = prevXp + amt;
    const newLevel = levelForXp(xp);

    const grant: XpGrant = { source, amount: amt, label, at: Date.now() };
    set({
      xp,
      level: newLevel,
      recentGrants: [grant, ...get().recentGrants].slice(0, 12),
    });

    const ups: LevelUpResult[] = [];
    for (let l = prevLevel + 1; l <= newLevel; l++) {
      ups.push({ from: l - 1, to: l, level: levelInfo(l) });
    }
    return ups;
  },

  evaluateAchievements(snap) {
    const have = new Set(get().unlockedAchievements);
    const newly: Achievement[] = [];
    for (const a of ACHIEVEMENTS) {
      if (have.has(a.id)) continue;
      let passed = false;
      try {
        passed = a.test(snap);
      } catch {
        passed = false;
      }
      if (passed) {
        have.add(a.id);
        newly.push(a);
      }
    }
    if (newly.length > 0) {
      set({ unlockedAchievements: [...have] });
      // Achievement XP folds back into the ladder.
      for (const a of newly) get().grantXp('milestone', a.xp, a.name);
    }
    return newly;
  },

  clearRecentGrants() {
    set({ recentGrants: [] });
  },

  save() {
    const { xp, level, unlockedAchievements } = get();
    saveData('progression', { xp, level, unlockedAchievements });
  },

  load() {
    const saved = loadData<{
      xp: number;
      level: number;
      unlockedAchievements: string[];
    }>('progression');
    if (saved) {
      set({
        xp: saved.xp ?? 0,
        level: saved.level ?? levelForXp(saved.xp ?? 0),
        unlockedAchievements: saved.unlockedAchievements ?? [],
        recentGrants: [],
      });
    }
  },

  reset() {
    set({ ...INITIAL });
  },
}));
