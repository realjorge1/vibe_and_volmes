import { create } from 'zustand';
import type { HeirInheritance, MetaProfile, PastLife, RetiredCareer } from '../types/meta';
import type { CareerDossier, LegacyTier } from '../types/legacy';
import { STARTING_PERKS } from '../data/meta/perks';
import { BLOODLINES } from '../data/meta/bloodlines';
import { saveMeta, loadMeta } from '../database/gameRepository';

/**
 * Cross-save meta-progression. The ONLY store that survives "new game" /
 * retirement: it persists to the dedicated `meta_profile` SQLite table,
 * NOT save_data, so clearAllData never touches it. It has no `reset()` by
 * design — wiping it would defeat its entire purpose.
 */

const TIER_RANK: Record<LegacyTier, number> = {
  forgotten: 0,
  footnote: 1,
  respected: 2,
  star: 3,
  icon: 4,
  legend: 5,
  immortal: 6,
};

function tierGte(a: LegacyTier, b: LegacyTier): boolean {
  return TIER_RANK[a] >= TIER_RANK[b];
}

interface MetaActions {
  /** Mint legacy + unlocks from a finished career. Returns newly unlocked. */
  recordRetirement: (dossier: CareerDossier) => {
    perkIds: string[];
    bloodlineIds: string[];
    legacyGained: number;
  };
  setPendingPerks: (ids: string[]) => void;
  setPendingHeir: (heir: HeirInheritance | null) => void;
  /** Hand the heir to onboarding once; clears it. */
  consumeHeir: () => HeirInheritance | null;
  setPendingBloodline: (id: string | null) => void;
  /** Consume the pending selections at onboarding; clears them. */
  consumePending: () => { perkIds: string[]; bloodlineId: string | null };
  isPerkUnlocked: (id: string) => boolean;
  /** A finished life joins the world of the lives after it. */
  addPastLife: (life: PastLife) => void;
  /** A challenge finished; mints its legacy. Returns false if already done this life. */
  recordChallenge: (id: string, artistName: string, legacy: number) => boolean;
  /** A dream came true (lifetime tally). */
  recordDream: (id: string) => void;
  load: () => void;
  save: () => void;
}

type MetaStore = MetaProfile & MetaActions;

const DEFAULT: MetaProfile = {
  lifetimeLegacy: 0,
  retiredCareers: [],
  unlockedPerkIds: [],
  unlockedBloodlineIds: [],
  pendingPerkIds: [],
  pendingBloodlineId: null,
  bestTier: 'forgotten',
  totalCareers: 0,
  identitiesEarned: {},
  pendingHeir: null,
  pastLives: [],
  challengesCompleted: [],
  dreamsEarned: {},
};

export const useMetaStore = create<MetaStore>((set, get) => ({
  ...DEFAULT,

  recordRetirement(dossier) {
    const s = get();
    const legacyGained = dossier.legacy.total;
    const lifetimeLegacy = s.lifetimeLegacy + legacyGained;

    const retired: RetiredCareer = {
      id: `career-${Date.now().toString(36)}`,
      artistName: dossier.artistName,
      identity: dossier.identity.label,
      legacyTier: dossier.legacy.tier,
      legacyTotal: dossier.legacy.total,
      weeksActive: dossier.weeksActive,
      peakFans: dossier.peakFans,
      retiredAtRealTime: Date.now(),
      ending: dossier.ending?.id,
    };

    // Perks unlock purely on accumulated lifetime legacy.
    const newPerks = STARTING_PERKS.filter(
      (p) =>
        lifetimeLegacy >= p.unlockAtLegacy &&
        !s.unlockedPerkIds.includes(p.id)
    ).map((p) => p.id);

    // Bloodlines unlock on THIS career's identity + tier.
    const newBloodlines = BLOODLINES.filter(
      (b) =>
        !s.unlockedBloodlineIds.includes(b.id) &&
        b.unlockIdentity.includes(dossier.identity.label) &&
        tierGte(dossier.legacy.tier, b.unlockTier)
    ).map((b) => b.id);

    const bestTier =
      TIER_RANK[dossier.legacy.tier] > TIER_RANK[s.bestTier]
        ? dossier.legacy.tier
        : s.bestTier;

    set({
      lifetimeLegacy,
      retiredCareers: [retired, ...s.retiredCareers].slice(0, 50),
      unlockedPerkIds: [...s.unlockedPerkIds, ...newPerks],
      unlockedBloodlineIds: [...s.unlockedBloodlineIds, ...newBloodlines],
      bestTier,
      totalCareers: s.totalCareers + 1,
      identitiesEarned: {
        ...s.identitiesEarned,
        [dossier.identity.label]: (s.identitiesEarned[dossier.identity.label] ?? 0) + 1,
      },
    });
    get().save();
    return {
      perkIds: newPerks,
      bloodlineIds: newBloodlines,
      legacyGained,
    };
  },

  setPendingPerks(ids) {
    set({ pendingPerkIds: ids });
    get().save();
  },

  setPendingHeir(heir) {
    set({ pendingHeir: heir });
    get().save();
  },

  consumeHeir() {
    const heir = get().pendingHeir;
    if (heir) {
      set({ pendingHeir: null });
      get().save();
    }
    return heir;
  },

  setPendingBloodline(id) {
    set({ pendingBloodlineId: id });
    get().save();
  },

  consumePending() {
    const { pendingPerkIds, pendingBloodlineId } = get();
    set({ pendingPerkIds: [], pendingBloodlineId: null });
    get().save();
    return { perkIds: pendingPerkIds, bloodlineId: pendingBloodlineId };
  },

  isPerkUnlocked(id) {
    return get().unlockedPerkIds.includes(id);
  },

  addPastLife(life) {
    set({ pastLives: [life, ...get().pastLives.filter((p) => p.id !== life.id)].slice(0, 20) });
    get().save();
  },

  recordChallenge(id, artistName, legacy) {
    const s = get();
    const sameLife = s.challengesCompleted.some((c) => c.id === id && c.artistName === artistName);
    if (sameLife) return false;
    set({
      challengesCompleted: [{ id, artistName, completedAt: Date.now() }, ...s.challengesCompleted].slice(0, 100),
      lifetimeLegacy: s.lifetimeLegacy + legacy,
    });
    get().save();
    return true;
  },

  recordDream(id) {
    const s = get();
    set({ dreamsEarned: { ...s.dreamsEarned, [id]: (s.dreamsEarned[id] ?? 0) + 1 } });
    get().save();
  },

  load() {
    const saved = loadMeta<MetaProfile>();
    if (saved) set({ ...DEFAULT, ...saved });
  },

  save() {
    const {
      lifetimeLegacy,
      retiredCareers,
      unlockedPerkIds,
      unlockedBloodlineIds,
      pendingPerkIds,
      pendingBloodlineId,
      bestTier,
      totalCareers,
      identitiesEarned,
      pendingHeir,
      pastLives,
      challengesCompleted,
      dreamsEarned,
    } = get();
    saveMeta({
      lifetimeLegacy,
      retiredCareers,
      unlockedPerkIds,
      unlockedBloodlineIds,
      pendingPerkIds,
      pendingBloodlineId,
      bestTier,
      totalCareers,
      identitiesEarned,
      pendingHeir,
      pastLives,
      challengesCompleted,
      dreamsEarned,
    });
  },
}));
