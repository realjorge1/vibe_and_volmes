import type { LegacyTier, IdentityLabel } from './legacy';
import type { PlayerStats } from './player';

// ─── Cross-Save Meta-Progression (Phase 5 foundation) ─────────────────────
//
// The ONLY state that survives "new game" / retirement. Persisted in its own
// `meta_profile` SQLite table (never touched by clearAllData). Retiring a
// career mints legacy points + may unlock perks/bloodlines that make the
// NEXT run feel like an inheritance, not a reset. This is the long-term
// retention spine.

/** A starting modifier the player can opt into at onboarding. */
export interface StartingPerk {
  id: string;
  label: string;
  description: string;
  /** Flat starting-stat nudges (applied after archetype). */
  statBonuses: Partial<PlayerStats>;
  startingMoneyBonus: number;
  startingFansBonus: number;
  startingTags: string[];
  /** Lifetime legacy points required before this perk is selectable. */
  unlockAtLegacy: number;
}

/**
 * A "bloodline" — inherited reputation from a previous legendary career.
 * Unlocked by retiring at a high tier; carries narrative + a perk bundle.
 */
export interface Bloodline {
  id: string;
  label: string;
  lore: string;
  /** Identity of the ancestor run that can unlock this. */
  unlockIdentity: IdentityLabel[];
  unlockTier: LegacyTier;
  perkId: string;             // the StartingPerk this bloodline grants
}

/** One retired career, kept as a lifetime hall-of-fame entry. */
export interface RetiredCareer {
  id: string;
  artistName: string;
  identity: IdentityLabel;
  legacyTier: LegacyTier;
  legacyTotal: number;
  weeksActive: number;
  peakFans: number;
  retiredAtRealTime: number;
}

export interface MetaProfile {
  /** Accumulated across every retired career — the unlock currency. */
  lifetimeLegacy: number;
  retiredCareers: RetiredCareer[];
  unlockedPerkIds: string[];
  unlockedBloodlineIds: string[];
  /** Selected for the NEXT run (consumed by onboarding → playerStore). */
  pendingPerkIds: string[];
  pendingBloodlineId: string | null;
  /** Highest tier ever reached, for UI bragging + bloodline gating. */
  bestTier: LegacyTier;
  totalCareers: number;
}
