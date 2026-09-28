/**
 * The global community season metadata. The player's seasonal standing
 * (percentile / position) is computed locally from their own sim state by
 * systems/community/standing.ts — this file only supplies the season name, the
 * flavor pool size, and the percentile→tier ladder used to label it.
 */
export const CURRENT_GLOBAL_SEASON = {
  id: 'global-s1',
  name: 'Global Season 1',
  /** Flavor pool the anonymous position is drawn from. */
  poolSize: 2_400_000,
} as const;

/** Percentile (>=) → tier label. Higher percentile = better. */
export const SEASON_TIERS: { min: number; label: string }[] = [
  { min: 0, label: 'Unranked' },
  { min: 20, label: 'Bronze' },
  { min: 40, label: 'Silver' },
  { min: 60, label: 'Gold' },
  { min: 78, label: 'Platinum' },
  { min: 90, label: 'Diamond' },
  { min: 97, label: 'Elite' },
  { min: 99.5, label: 'Hall of Fame' },
];

export function tierForPercentile(percentile: number): string {
  let label = SEASON_TIERS[0].label;
  for (const t of SEASON_TIERS) if (percentile >= t.min) label = t.label;
  return label;
}
