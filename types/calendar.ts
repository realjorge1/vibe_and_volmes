/**
 * THE MUSIC YEAR.
 *
 * Twelve weeks make a year, and the year has fixed tentpoles: the festival
 * lineup and the festival weekend, award nominations and award night, the
 * holiday season, and Wrapped when the year turns. Plus the chart: a living
 * board of the artist's songs against the world's.
 */

// ─── Awards ───────────────────────────────────────────────────────────────────

export type AwardCategoryId =
  | 'best-new-artist'
  | 'song-of-the-year'
  | 'artist-of-the-year'
  | 'best-genre'
  | 'live-act';

export interface Nominee {
  name: string;
  npcId?: string;
  isPlayer: boolean;
  /** The song, for song categories. */
  work?: string;
  /** Voter appeal, 0..100. */
  score: number;
}

export interface Nomination {
  category: AwardCategoryId;
  label: string;
  nominees: Nominee[];
}

export interface AwardResult {
  category: AwardCategoryId;
  label: string;
  winner: Nominee;
  playerNominated: boolean;
  playerWon: boolean;
}

export interface AwardsState {
  /** Career year the show belongs to. */
  year: number;
  show: string;
  nominations: Nomination[];
  /** "For your consideration" spend. */
  campaign: number;
  /** Rolled once, when the night starts, so reopening never re-rolls. */
  results: AwardResult[] | null;
  /** The player went through the night (vs. it resolving on its own). */
  attended: boolean;
  resolved: boolean;
  redCarpet: string | null;
}

export interface AwardRecord {
  year: number;
  category: AwardCategoryId;
  label: string;
  won: boolean;
  work?: string;
}

// ─── Festival ─────────────────────────────────────────────────────────────────

export type FestivalSlot = 'undercard' | 'mid' | 'sub-headliner' | 'headliner';

export interface FestivalBooking {
  year: number;
  name: string;
  /** The lineup poster, biggest names first: [headliners, subs, mid, undercard]. */
  tiers: string[][];
  /** Null when the artist didn't make the poster. */
  slot: FestivalSlot | null;
  fee: number;
  /** null until the artist answers. */
  accepted: boolean | null;
  /** The festival weekend. */
  week: number;
  played: boolean;
  score: number | null;
}

export interface FestivalRecord {
  year: number;
  name: string;
  slot: FestivalSlot;
  score: number;
}

// ─── The chart board ──────────────────────────────────────────────────────────

/** A song by someone else, living on the chart. */
export interface NpcSong {
  id: string;
  title: string;
  artist: string;
  npcId?: string;
  /** Set when the song belongs to the artist's rival. */
  rivalId?: string;
  score: number;
  debutWeek: number;
  peak: number | null;
  weeksOn: number;
  lastPos: number | null;
}

export interface ChartRow {
  pos: number;
  title: string;
  artist: string;
  trackId?: string;
  npcSongId?: string;
  isPlayer: boolean;
  isRival: boolean;
  lastPos: number | null;
  peak: number;
  weeksOn: number;
  streams?: number;
}

export interface ChartBoard {
  week: number;
  rows: ChartRow[];
}

/** A chart week worth stopping for: something of the artist's moved. */
export interface ChartDay {
  week: number;
  seen: boolean;
  /** The headline beat: 'number-one' | 'top-10' | 'debut' | 'climb' | 'fall'. */
  beat: 'number-one' | 'top-10' | 'debut' | 'climb' | 'fall' | 'steady';
}

// ─── Wrapped ──────────────────────────────────────────────────────────────────

export interface YearSnapshot {
  year: number;
  week: number;
  fans: number;
  lifetimeEarnings: number;
  /** Track id → total streams when the year began. */
  trackStreams: Record<string, number>;
  releases: number;
}

export interface WrappedCard {
  year: number;
  age: number;
  streams: number;
  fansGained: number;
  earned: number;
  topSong: { title: string; streams: number } | null;
  releases: number;
  bestPeak: number | null;
  showsPlayed: number;
  bestShow: number | null;
  awardsWon: number;
  nominations: number;
  biggestMoment: string | null;
  /** "Top 3% of artists" — rank among the world's artists by fans. */
  rankLine: string;
  newPeople: string[];
  wantsMet: number;
  seen: boolean;
}
