import { create } from 'zustand';
import type { MetaProfile, RetiredCareer } from '../types/meta';
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
  setPendingBloodline: (id: string | null) => void;
  /** Consume the pending selections at onboarding; clears them. */
  consumePending: () => { perkIds: string[]; bloodlineId: string | null };
  isPerkUnlocked: (id: string) => boolean;
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
    });
  },
}));
