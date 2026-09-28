import type { MusicGenre } from './player';

// ─── Dynamic Culture & Era System (Phase 5, deep vertical) ────────────────
//
// The world itself ages. An ordered timeline of cultural eras advances on
// its own clock; each era reshapes what sounds current, how volatile fans
// are, how hostile media is, and how much authenticity is rewarded. The
// engine contributes mechanical pressure through the shared InfluenceBundle
// (same rule as every Phase 3 system) and ALSO exposes a pure read-only
// `CultureBias` that the scoring / trend / event engines consult so a
// career in Year 1 feels culturally different from a career in Year 15.

export type EraId =
  | 'blog-era'
  | 'streaming-boom'
  | 'short-video-virality'
  | 'algorithmic-saturation'
  | 'ai-flood'
  | 'post-authenticity';

export type GenreTrend = 'rising' | 'hot' | 'cooling' | 'saturated' | 'revival';

/** How a single era bends the simulation. All multipliers center on 1.0. */
export interface EraDefinition {
  id: EraId;
  label: string;
  /** One-line in-world description shown to the player. */
  vibe: string;
  /** Narrative used by the chronicle/documentary for era context. */
  chronicle: string;
  /** Soft minimum / maximum weeks before the era can roll over. */
  minWeeks: number;
  maxWeeks: number;
  /** Per-genre cultural fit while this era is dominant (0.6 .. 1.4). */
  genreFit: Partial<Record<MusicGenre, number>>;
  /** Genres this era pushes into the spotlight (drives trend descriptors). */
  ascendantGenres: MusicGenre[];
  /** 0..1 — how reactive/volatile fans are to events this era. */
  fanVolatility: number;
  /** 0..1 — how aggressively media spins stories this era. */
  mediaHostility: number;
  /** 0..1 — how much authenticity (vs spectacle) the public rewards. */
  authenticityWeight: number;
  /** Hashtag/era flavor injected into trending. */
  trendDescriptors: string[];
  /** What counts as scandalous shifts era to era (used by chronicle text). */
  scandalStandard: string;
}

/** Live per-genre climate, drifting every week within the active era. */
export interface GenreClimate {
  genre: MusicGenre;
  heat: number;        // 0-100 current cultural temperature
  trend: GenreTrend;
  weeksInTrend: number;
}

export interface EraHistoryEntry {
  eraId: EraId;
  startedWeek: number;
  endedWeek: number | null;
}

export interface CultureState {
  eraId: EraId;
  eraIndex: number;          // position in the ordered timeline
  eraStartedWeek: number;
  weeksInEra: number;
  genreClimate: GenreClimate[];
  eraHistory: EraHistoryEntry[];
}

/**
 * Pure, read-only view the scoring / trend / event engines consult. Never a
 * store mutation — it is a derived read, exactly like scoreEngine already
 * reads player state. Mechanical stat/fan deltas still flow through the
 * InfluenceBundle, never through this object.
 */
export interface CultureBias {
  eraId: EraId;
  eraLabel: string;
  /** Multiplier (0.6 .. 1.4) for the player's own genre right now. */
  playerGenreFit: number;
  /** Heat 0-100 of the player's genre. */
  playerGenreHeat: number;
  playerGenreTrend: GenreTrend;
  fanVolatility: number;
  mediaHostility: number;
  authenticityWeight: number;
  trendDescriptors: string[];
  ascendantGenres: MusicGenre[];
}
