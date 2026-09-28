import type { StoryCard } from './legacy';

// ─── Optional Online Seam (Phase 5, offline-first) ────────────────────────
//
// The game is 100% playable offline. This interface is the ONLY seam where
// a future lightweight, asynchronous community layer could plug in — exactly
// mirroring the Phase 4 disabled-cloud-provider pattern. The shipped default
// is `localSync` (bundled seed legends, no network). `cloudSync` exists as a
// disabled stub so turning it on later is "implement the adapter", nothing
// else. Never make gameplay block on or depend on a sync call.

/** A discoverable legendary artist (player-shared or bundled seed). */
export interface CommunityLegend {
  id: string;
  artistName: string;
  identityTitle: string;
  legacyTier: string;
  legacyTotal: number;
  era: string;
  signatureMoment: string;
  /** True for shipped seed data, false for community-fetched entries. */
  seeded: boolean;
}

/** A row on the anonymous global chart. */
export interface GlobalChartEntry {
  rank: number;
  artistName: string;
  trackTitle: string;
  /** Pre-formatted streams figure, e.g. "12.4M". */
  streamsLabel: string;
  /** True when this row is the player's own (anonymized) standing. */
  isPlayer?: boolean;
  seeded: boolean;
}

/** The player's anonymous standing in the current global season. */
export interface SeasonalRank {
  seasonName: string;
  /** 0-100 percentile (higher = better). */
  percentile: number;
  /** Tier label, e.g. "Platinum II". */
  tier: string;
  /** Anonymous global position. */
  position: number;
  /** Pool size the position is drawn from. */
  poolSize: number;
}

/** A time-boxed community-wide event (no direct multiplayer). */
export interface CommunityEventDef {
  id: string;
  name: string;
  blurb: string;
  /** ActivityId that earns bonus visibility during the window (kept loose to
   *  avoid a cross-module import cycle with types/passive). */
  boostActivity: string;
  /** Flavor goal the community is chasing collectively. */
  goalLabel: string;
}

export interface SyncAdapter {
  readonly id: 'local' | 'cloud';
  readonly online: boolean;
  /** Push a finished career card outward. Never throws; degrades silently. */
  publishCareer(card: StoryCard): Promise<{ ok: boolean }>;
  /** Pull discoverable legends. Offline returns bundled seed data. */
  fetchLegends(limit: number): Promise<CommunityLegend[]>;
  /** Lightweight global hall-of-fame ranking (local = seed + own runs). */
  fetchHallOfFame(limit: number): Promise<CommunityLegend[]>;
  /** Anonymous global chart (local = seed rows blended with the player's track). */
  fetchGlobalCharts(limit: number): Promise<GlobalChartEntry[]>;
  /** The player's anonymous seasonal standing (local = computed from sim state). */
  fetchSeasonalRanking(): Promise<SeasonalRank>;
  /** Active community-wide events (local = bundled rotation). */
  fetchCommunityEvents(): Promise<CommunityEventDef[]>;
}
