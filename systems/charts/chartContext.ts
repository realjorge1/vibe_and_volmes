import type { PlayerStats } from '../../types/player';
import type { Track } from '../../types/music';
import type { ChartContext } from './chartEngine';
import { useLabelStore } from '../../store/labelStore';
import { LABELS } from '../../data/industry/labels';
import { getCultureBias } from '../culture/cultureEngine';
import { clamp } from '../../utils/random';

/**
 * Assembles the LIVE, world-state chart factors (label, culture, reputation)
 * that `systems/charts/chartEngine.ts` consumes. Kept separate from the pure
 * chart math so the engine stays deterministic and testable while this side
 * reads the stores. Used at both release time and the weekly recompute.
 */

/** 0-100 backing the player's label puts behind a release (power × trust). */
export function computeLabelBacking(): number {
  const contract = useLabelStore.getState().contract;
  if (!contract) return 0;
  const label = LABELS.find((l) => l.id === contract.labelId);
  if (!label) return 0;
  const trustFactor = clamp((contract.trust + 100) / 200, 0, 1); // 0..1
  return clamp(label.marketingPower * (0.6 + 0.4 * trustFactor), 0, 100);
}

/** 0-100 alignment between the player's sound and the current cultural moment. */
export function computeTrendAlignment(): number {
  const c = getCultureBias();
  return clamp(c.playerGenreHeat * c.playerGenreFit, 0, 100);
}

/** 0-100 reputation blend used by the chart score. */
export function reputationScore(stats: PlayerStats): number {
  return clamp((stats.reputation + stats.industryRespect) / 2, 0, 100);
}

/** The live reads shared by every track this week / at release. */
export function liveChartReads(stats: PlayerStats): {
  reputation: number;
  labelBacking: number;
  trendAlignment: number;
} {
  return {
    reputation: reputationScore(stats),
    labelBacking: computeLabelBacking(),
    trendAlignment: computeTrendAlignment(),
  };
}

/**
 * Build the per-week chart context. `latestBuzz` (0-100) is the social-buzz
 * lift for the freshest release (e.g. derived from the trend board); older
 * catalog tracks ride the shared trend alignment but carry no fresh buzz.
 */
export function buildWeeklyChartContext(
  stats: PlayerStats,
  latestTrackId: string | null,
  latestBuzz: number
): ChartContext {
  const reads = liveChartReads(stats);
  return {
    ...reads,
    fans: stats.fans,
    buzzForTrack: (track: Track) =>
      track.id === latestTrackId ? clamp(latestBuzz, 0, 100) : 0,
  };
}
