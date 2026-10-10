import type { LegacyTier, IdentityLabel } from './legacy';
import type { Gender, MusicGenre, PlayerStats } from './player';
import type { EndingId } from './life';

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
  /** How the career ended (older records predate endings). */
  ending?: EndingId;
}

/** Someone from the last career who is family to the heir. */
export interface HeirFamilyMember {
  name: string;
  role: 'parent' | 'sibling';
  title: string;
  affinity: number;
  traits: string[];
}

/**
 * "Continue as your child": everything the next career inherits, written to
 * the meta profile BEFORE retirement wipes the save (only the meta profile
 * survives), then consumed by onboarding.
 */
export interface HeirInheritance {
  /** 2 for the first child run, 3 for a grandchild… */
  generation: number;
  childName: string;
  surname: string;
  gender: Gender;
  startAge: number;
  city: string;
  /** The genre leaning; onboarding pre-selects it. */
  genre: MusicGenre;
  money: number;
  /** Fans who follow the name into the next generation. */
  fans: number;
  /** The family's rivals, who remember. */
  rivalIds: string[];
  /** Picked automatically from the parent's identity. */
  bloodlineId: string | null;
  parent: {
    artistName: string;
    identity: IdentityLabel;
    identityTitle: string;
    legacyTier: LegacyTier;
    ending: EndingId;
  };
  family: HeirFamilyMember[];
}

/**
 * A life that ended, still alive in the world of the lives after it: their
 * songs are on the radio, their name is in the comparisons, and when they
 * are gone, their estate still releases music.
 */
export interface PastLife {
  id: string;
  artistName: string;
  genre: MusicGenre;
  gender: Gender;
  city: string;
  identity: IdentityLabel;
  identityTitle: string;
  legacyTier: LegacyTier;
  ending: EndingId;
  died: boolean;
  ageAtEnd: number;
  peakFans: number;
  /** Their biggest songs, best first. */
  hits: { title: string; peak: number | null }[];
  generation: number;
  endedAt: number;
}

/** A challenge finished in some life. */
export interface ChallengeRecord {
  id: string;
  artistName: string;
  completedAt: number;
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
  /** Identity ribbons collected across careers, with how many times. */
  identitiesEarned: Partial<Record<IdentityLabel, number>>;
  /** Set when the last career chose to continue as a child. */
  pendingHeir: HeirInheritance | null;
  /** Every finished life, newest first: they live on in the next world. */
  pastLives: PastLife[];
  /** Challenges completed across lives. */
  challengesCompleted: ChallengeRecord[];
  /** Dreams that came true, across lives (by dream id → count). */
  dreamsEarned: Partial<Record<string, number>>;
}
