import type { EraId } from './culture';
import type { HistoryKind } from './industry';
import type { EndingId } from './life';

// ─── Chronicle / Legacy System (Phase 5 foundation) ───────────────────────
//
// A PURE PROJECTOR over data the deterministic sim already recorded
// (careerStore.history / arc / economy, musicStore charts, cultureStore
// eras). It never drives the simulation — same decorator contract as the
// Phase 4 AI layer. Turning the projector off changes nothing mechanical.

/** Emergent identity the player's run is remembered by. Derived, not chosen. */
export type IdentityLabel =
  | 'authentic-legend'
  | 'industry-puppet'
  | 'chaotic-genius'
  | 'cancelled-icon'
  | 'commercial-sellout'
  | 'cult-favorite'
  | 'one-hit-wonder'
  | 'untouchable-mogul'
  | 'tragic-prodigy'
  | 'journeyman';

export interface IdentityVerdict {
  label: IdentityLabel;
  title: string;          // human-facing ("The Cancelled Icon")
  blurb: string;          // why the world sees them this way
  confidence: number;     // 0-100 how strongly the run fits this identity
}

/** A single dramatized beat in the career retrospective. */
export interface LegendaryMoment {
  id: string;
  week: number;
  eraId: EraId | null;
  kind: HistoryKind | 'peak' | 'debut' | 'era-shift';
  headline: string;
  detail: string;
  weight: number;         // 0-100 how legendary (drives ordering / inclusion)
}

export interface LegacyScore {
  total: number;          // 0-1000 composite
  fameComponent: number;
  longevityComponent: number;
  influenceComponent: number;
  artistryComponent: number;
  notorietyComponent: number;
  tier: LegacyTier;
}

export type LegacyTier =
  | 'forgotten'
  | 'footnote'
  | 'respected'
  | 'star'
  | 'icon'
  | 'legend'
  | 'immortal';

/** The full retrospective the chronicle screen / export / documentary use. */
export interface CareerDossier {
  artistName: string;
  realName: string;
  genre: string;
  archetype: string;
  weeksActive: number;
  peakFans: number;
  lifetimeEarnings: number;
  comebackCount: number;
  erasLived: EraId[];
  identity: IdentityVerdict;
  legacy: LegacyScore;
  moments: LegendaryMoment[];
  /** AI/deterministic documentary narration paragraphs. */
  documentary: string[];
  retiredWeek: number | null;
  /** How it ended, once it has. */
  ending?: {
    id: EndingId;
    label: string;
    kind: 'retired' | 'quit' | 'died';
    age: number;
    finalLine: string;
  };
}

/** Compact, shareable card derived from the dossier (offline export). */
export interface StoryCard {
  artistName: string;
  tagline: string;        // identity + tier, one line
  statLines: string[];    // 3-5 punchy stat lines
  signatureMoment: string;
  legacyTier: LegacyTier;
  legacyTotal: number;
  shareText: string;      // full plain-text block for the OS share sheet
}
