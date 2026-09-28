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
