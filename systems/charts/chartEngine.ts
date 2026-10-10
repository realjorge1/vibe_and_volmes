import type {
  Track,
  ChartEntry,
  TrackStatus,
  ChartFactorBreakdown,
} from '../../types/music';
import { clamp } from '../../utils/random';
import { isBuilding, stepRelease } from '../music/releaseCurve';

const CHART_SIZE = 100;

/**
 * CHART COMPUTATION ENGINE.
 *
 * A song's chart standing is a weighted composite of six forces, not raw
 * streams alone (Phase 3 brief): streams, social buzz, playlist support,
 * trend alignment, label backing, and reputation. Streams dominate, the rest
 * modulate. This module is PURE math — the live factor reads (label, culture,
 * reputation) are assembled by `systems/charts/chartContext.ts` and passed in,
 * so the engine stays deterministic and testable.
 */

/** Normalize weekly streams onto a 0-100 scale (~10M weekly = saturated). */
export function streamScore(weeklyStreams: number): number {
  if (weeklyStreams <= 0) return 0;
  return clamp(
    (Math.log10(weeklyStreams + 1) / Math.log10(10_000_000)) * 100,
    0,
    100
  );
}

/**
 * The support factors (buzz, playlists, trend, label, reputation) amplify a
 * record people are actually playing; they can't chart a song nobody streams.
 * 0 below ~5K weekly streams, half strength ~100K, full from ~1M.
 */
export function supportGate(weeklyStreams: number): number {
  if (weeklyStreams <= 0) return 0;
  return clamp((Math.log10(weeklyStreams) - 3.7) / 2.3, 0, 1);
}

export interface ChartFactorInputs {
  weeklyStreams: number;
  socialBuzz: number; // 0-100
  playlistSupport: number; // 0-100
  trendAlignment: number; // 0-100
  labelBacking: number; // 0-100
  reputation: number; // 0-100
}

export interface ChartScore {
  /** Composite 0-100. Higher charts higher. */
  score: number;
  /** Each factor normalized to 0-100, for the "why it charted" UI. */
  factors: ChartFactorBreakdown;
}

/** Relative pull of each factor. Streams dominate; the rest are kingmakers. */
export const CHART_WEIGHTS = {
  streams: 0.5,
  socialBuzz: 0.14,
  playlistSupport: 0.12,
  trendAlignment: 0.1,
  labelBacking: 0.08,
  reputation: 0.06,
} as const;

export function computeChartScore(inp: ChartFactorInputs): ChartScore {
  const factors: ChartFactorBreakdown = {
    streams: streamScore(inp.weeklyStreams),
    socialBuzz: clamp(inp.socialBuzz, 0, 100),
    playlistSupport: clamp(inp.playlistSupport, 0, 100),
    trendAlignment: clamp(inp.trendAlignment, 0, 100),
    labelBacking: clamp(inp.labelBacking, 0, 100),
    reputation: clamp(inp.reputation, 0, 100),
  };
  const support =
    factors.socialBuzz * CHART_WEIGHTS.socialBuzz +
    factors.playlistSupport * CHART_WEIGHTS.playlistSupport +
    factors.trendAlignment * CHART_WEIGHTS.trendAlignment +
    factors.labelBacking * CHART_WEIGHTS.labelBacking +
    factors.reputation * CHART_WEIGHTS.reputation;
  const score = clamp(
    factors.streams * CHART_WEIGHTS.streams + support * supportGate(inp.weeklyStreams),
    0,
    100
  );
  return { score, factors };
}

/** Map a composite chart score (0-100) to a chart position, or off-chart. */
export function chartPositionFromScore(score: number): number | null {
  if (score < 26) return null;
  if (score >= 82) return 1;
  if (score >= 76) return 2;
  if (score >= 70) return 5;
  if (score >= 63) return 10;
  if (score >= 56) return 20;
  if (score >= 49) return 35;
  if (score >= 42) return 55;
  if (score >= 35) return 75;
  if (score >= 30) return 90;
  return CHART_SIZE;
}

/**
 * Legacy streams-only mapping. Kept as the fallback for the quick-drop path
 * and any context where the full factor set isn't available.
 */
export function getChartPosition(weeklyStreams: number): number | null {
  if (weeklyStreams < 5_000) return null;
  if (weeklyStreams >= 8_000_000) return 1;
  if (weeklyStreams >= 4_000_000) return 2;
  if (weeklyStreams >= 2_000_000) return 5;
  if (weeklyStreams >= 1_000_000) return 10;
  if (weeklyStreams >= 500_000) return 20;
  if (weeklyStreams >= 200_000) return 40;
  if (weeklyStreams >= 75_000) return 65;
  if (weeklyStreams >= 25_000) return 85;
  return CHART_SIZE;
}

/** A marketing campaign's chart push fades in the weeks after release. */
function decayMarketing(seed: number, weeksOut: number): number {
  if (seed <= 0 || weeksOut <= 0) return seed;
  return seed * Math.pow(0.5, weeksOut);
}

function nextStatus(
  current: TrackStatus,
  weeksOut: number,
  weeklyStreams: number,
  peakChartPosition: number | null,
  building: boolean
): TrackStatus {
  // A song still finding its audience isn't written off for small numbers.
  if (building) return 'charting';
  if (weeklyStreams < 2_000) {
    return peakChartPosition !== null && peakChartPosition <= 10
      ? 'classic'
      : 'forgotten';
  }
  if (weeksOut <= 1) return 'charting';
  if (weeklyStreams >= 50_000) return 'charting';
  return 'fading';
}

export interface WeeklyChartUpdate {
  tracks: Track[];
  entries: ChartEntry[];
  weeklyStreamTotal: number;
  /** Fans the catalog won this week (songs with release momentum). */
  fansGained: number;
}

/**
 * Live, world-state factors shared by every track this week. Built by
 * `systems/charts/chartContext.ts` from the player, label, and culture.
 */
export interface ChartContext {
  /** 0-100 reputation blend (public reputation + industry respect). */
  reputation: number;
  /** 0-100 label backing (label marketing power × trust). */
  labelBacking: number;
  /** 0-100 genre trend alignment from the cultural era. */
  trendAlignment: number;
  /** 0-100 social buzz for a given track (trend board lift). */
  buzzForTrack: (track: Track) => number;
  /** The artist's live fan count; songs still out there follow it. */
  fans?: number;
}

/**
 * Move each active track's streams one week along its life (songs with
 * release momentum build then fade and win fans as they go; legacy tracks only
 * decay), recompute chart positions and statuses, and emit chart entries. When `ctx` is supplied the position is
 * the full multi-factor composite (blending each track's persisted release
 * factors with this week's live world state); without it, streams-only.
 */
export function updateWeeklyCharts(
  tracks: Track[],
  week: number,
  ctx?: ChartContext
): WeeklyChartUpdate {
  const entries: ChartEntry[] = [];
  let weeklyStreamTotal = 0;
  let fansGained = 0;

  const updated = tracks.map((t) => {
    if (t.status === 'forgotten' || t.status === 'classic') return t;

    const weeksOut = week - t.releasedAtWeek;
    let weeklyStreams = t.weeklyStreams;
    let momentum = t.momentum;
    let fansWon = 0;
    if (weeksOut > 0 && t.momentum) {
      const step = stepRelease({ ...t, momentum: t.momentum }, weeksOut, ctx?.fans);
      weeklyStreams = step.weeklyStreams;
      momentum = step.momentum;
      fansWon = step.fansWon;
    } else if (weeksOut > 0) {
      // Legacy tracks: streams decay fast after release; viral ones slower.
      weeklyStreams = Math.round(t.weeklyStreams * (t.wentViral ? 0.62 : 0.48));
    }
    fansGained += fansWon;

    const totalStreams = t.totalStreams + (weeksOut <= 0 ? 0 : weeklyStreams);

    // Marketing push fades; the rest of the playlist support persists.
    const marketingSeed = decayMarketing(t.marketingSeed ?? 0, Math.max(0, weeksOut));

    let position: number | null;
    if (ctx) {
      const playlistSupport = clamp(
        (t.producerReputation ?? 0) * 0.45 +
          marketingSeed * 0.4 +
          ctx.labelBacking * 0.15,
        0,
        100
      );
      const socialBuzz = clamp(
        ctx.buzzForTrack(t) + (t.collabReach ?? 0) * 0.3,
        0,
        100
      );
      const { score } = computeChartScore({
        weeklyStreams,
        socialBuzz,
        playlistSupport,
        trendAlignment: ctx.trendAlignment,
        labelBacking: ctx.labelBacking,
        reputation: ctx.reputation,
      });
      position = chartPositionFromScore(score);
    } else {
      position = getChartPosition(weeklyStreams);
    }

    const peakChartPosition =
      position !== null &&
      (t.peakChartPosition === null || position < t.peakChartPosition)
        ? position
        : t.peakChartPosition;

    const status = nextStatus(
      t.status,
      weeksOut,
      weeklyStreams,
      peakChartPosition,
      isBuilding(t, weeksOut)
    );

    if (position !== null && status !== 'forgotten') {
      entries.push({
        week,
        trackId: t.id,
        trackTitle: t.title,
        position,
        streams: weeklyStreams,
      });
      weeklyStreamTotal += weeklyStreams;
    }

    return {
      ...t,
      weeklyStreams,
      totalStreams,
      marketingSeed,
      peakChartPosition,
      status,
      ...(momentum ? { momentum, fansEarned: (t.fansEarned ?? 0) + fansWon } : {}),
    };
  });

  return { tracks: updated, entries, weeklyStreamTotal, fansGained };
}
