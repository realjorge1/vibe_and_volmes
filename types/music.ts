import type { MusicGenre } from './player';

export type TrackType = 'single' | 'ep' | 'album';
export type TrackStatus = 'charting' | 'fading' | 'classic' | 'forgotten';

export interface Track {
  id: string;
  title: string;
  type: TrackType;
  genre: MusicGenre;
  releasedAtWeek: number;
  quality: number;           // 0-100
  replayValue: number;       // 0-100
  originality: number;       // 0-100
  mainstreamAppeal: number;  // 0-100
  peakChartPosition: number | null;
  peakFans: number;
  weeklyStreams: number;
  totalStreams: number;
  status: TrackStatus;
  wentViral: boolean;
  // ─── Release-time chart inputs (Phase 3 multi-factor charts) ──────────────
  // Persisted so the weekly recompute can blend these locked-in factors with
  // live ones (social buzz, trend, label, reputation). Optional: legacy tracks
  // and the quick-drop path simply omit them and fall back to streams-only.
  /** Producer reputation of the beat used, 0-100. */
  producerReputation?: number;
  /** Marketing strength at release, 0-100. Fades over the weeks after drop. */
  marketingSeed?: number;
  /** Combined reach of featured collaborators, 0-100. */
  collabReach?: number;
  // ─── Release momentum (slow-burn releases) ────────────────────────────────
  // Optional: legacy tracks omit it and keep the old front-loaded decay.
  /** How the song builds and fades after release. See systems/music/releaseCurve. */
  momentum?: ReleaseMomentum;
  /** Fans this song has won so far, release week included. */
  fansEarned?: number;
  /** Critics' score at release, 0-100. */
  criticsScore?: number;
  // ─── Masters & royalties ──────────────────────────────────────────────────
  // Optional: songs from before masters existed are the artist's own.
  /** Who owns the recording: the artist, the label that released it, or a buyer. */
  owner?: 'artist' | 'label' | 'vault';
  /** The label the song was released under, when label-owned. */
  ownerLabelId?: string;
  /** Share of the song's streaming revenue the artist keeps, 0..1. */
  royaltyShare?: number;
  /** "(Your Version)": the id of the song this re-records. */
  rerecordOf?: string;
  /** Set on a song once the artist has re-recorded it. */
  rerecorded?: boolean;
  // ─── Story stamps ─────────────────────────────────────────────────────────
  /** Comes back every holiday season. */
  seasonal?: 'holiday';
  /** The era it was released in. */
  eraId?: string;
  /** Released as a comeback record. */
  comeback?: boolean;
  /** Recorded in a cell. */
  jailTape?: boolean;
  /** Samples a past life's hit (the title). */
  sampleOf?: string;
}

/**
 * A song's life after release. An unknown artist's song opens small and grows
 * by word of mouth; a superstar's opens near its peak. Fixed at release except
 * `audienceFans` (re-sized every week) and the breakout fields.
 */
export interface ReleaseMomentum {
  /** Weekly streams multiplier while the song is still building. */
  growth: number;
  /** Weeks after release the song keeps building before it starts to fade. */
  buildWeeks: number;
  /** Weekly streams multiplier once it has peaked. */
  fade: number;
  /** Fans won per stream. */
  fansPerStream: number;
  /** The fan count the song's audience was last sized against. */
  audienceFans: number;
  /** Chance per building week that the song breaks out (goes viral late). */
  breakoutChance: number;
}

export interface ChartEntry {
  week: number;
  trackId: string;
  trackTitle: string;
  position: number;
  streams: number;
}

export type ReleaseReception = 'flop' | 'mixed' | 'solid' | 'hit' | 'smash' | 'viral';

/** Each chart factor normalized to 0-100 — the "why it charted" breakdown. */
export interface ChartFactorBreakdown {
  streams: number;
  socialBuzz: number;
  playlistSupport: number;
  trendAlignment: number;
  labelBacking: number;
  reputation: number;
}

export interface ReleaseResult {
  track: Track;
  chartPosition: number | null;
  fansGained: number;
  reception: ReleaseReception;
  streamCount: number;
  criticsScore: number;
  message: string;
  /** Composite chart score 0-100 (multi-factor releases only). */
  chartScore?: number;
  /** Factor breakdown behind the chart position (multi-factor releases only). */
  chartFactors?: ChartFactorBreakdown;
}
