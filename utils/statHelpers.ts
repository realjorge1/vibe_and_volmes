import { FAME_LEVELS, REPUTATION_TIERS } from '../constants/gameConfig';
import { COLORS } from '../constants/theme';
import type { PlayerStats } from '../types/player';
import { clamp } from './random';

export function getFameLevel(fans: number) {
  let result: (typeof FAME_LEVELS)[number] = FAME_LEVELS[0];
  for (const level of FAME_LEVELS) {
    if (fans >= level.minFans) result = level;
    else break;
  }
  return result;
}

export function getFameLevelNumber(fans: number): number {
  return getFameLevel(fans).level;
}

/**
 * 0..1: how far the artist's name carries, on a log scale of fans.
 * 0 fans → 0, 1K → 0.33, 10K → 0.5, 100K → 0.67, 1M → 0.83, 10M → 1.
 */
export function fameReach(fans: number): number {
  return clamp((Math.log10(Math.max(0, fans) + 10) - 1) / 6, 0, 1);
}

export function getReputationTier(reputation: number) {
  return REPUTATION_TIERS.find(
    (t) => reputation >= t.min && reputation < t.max
  ) ?? REPUTATION_TIERS[REPUTATION_TIERS.length - 1];
}

export function applyStatDelta(
  stats: PlayerStats,
  changes: Array<{ stat: keyof PlayerStats; delta: number }>
): PlayerStats {
  const next = { ...stats };
  for (const { stat, delta } of changes) {
    if (stat === 'fans') {
      next.fans = Math.max(0, next.fans + delta);
    } else {
      (next[stat] as number) = clamp((next[stat] as number) + delta, 0, 100);
    }
  }
  return next;
}

export function formatFanCount(fans: number): string {
  if (fans >= 1_000_000_000) return `${(fans / 1_000_000_000).toFixed(1)}B`;
  if (fans >= 1_000_000) return `${(fans / 1_000_000).toFixed(1)}M`;
  if (fans >= 1_000) return `${(fans / 1_000).toFixed(1)}K`;
  return fans.toString();
}

export function formatMoney(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export function formatStreams(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

/** Stat 0-100 → data color (low → high). */
export function statColor(value: number): string {
  if (value >= 70) return COLORS.positive;
  if (value >= 50) return COLORS.accent;
  if (value >= 30) return COLORS.warning;
  return COLORS.negative;
}

/** Weekly stat decay — some stats decay if neglected */
export function weeklyStatDecay(stats: PlayerStats): Partial<PlayerStats> {
  return {
    energy: clamp(stats.energy - 5, 0, 100),
    mentalHealth: stats.mentalHealth < 60 ? clamp(stats.mentalHealth - 2, 0, 100) : stats.mentalHealth,
  };
}
