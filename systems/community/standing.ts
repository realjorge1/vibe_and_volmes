import type { GlobalChartEntry, SeasonalRank } from '../../types/sync';
import { usePlayerStore } from '../../store/playerStore';
import { useMusicStore } from '../../store/musicStore';
import { CURRENT_GLOBAL_SEASON, tierForPercentile } from '../../data/community/seasons';
import { clamp } from '../../utils/random';

/**
 * Computes the player's ANONYMOUS community standing entirely from local sim
 * state — no network, no PII, no multiplayer. The sync adapter calls these to
 * splice the player into the global chart and report a seasonal percentile.
 */

/** Pretty-print a streams figure, e.g. 12_400_000 → "12.4M". */
export function formatStreams(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

/** The player's best track's total streams (0 if nothing released yet). */
function playerTopTrack(): { title: string; streams: number } {
  const disc = useMusicStore.getState().discography;
  if (!disc.length) return { title: 'Unreleased', streams: 0 };
  let best = disc[0];
  for (const t of disc) if (t.totalStreams > best.totalStreams) best = t;
  return { title: best.title, streams: best.totalStreams };
}

/** The player's own row for the global chart (rank is assigned by the adapter). */
export function playerChartEntry(): GlobalChartEntry {
  const player = usePlayerStore.getState().player;
  const top = playerTopTrack();
  return {
    rank: 0,
    artistName: player?.artistName ?? 'You',
    trackTitle: top.title,
    streamsLabel: formatStreams(top.streams),
    isPlayer: true,
    seeded: false,
    // raw streams carried for ranking via a non-typed back-channel below.
  };
}

/** Raw streams used to position the player against seed rows. */
export function playerTopStreams(): number {
  return playerTopTrack().streams;
}

/** The player's anonymous seasonal standing, derived from fame + reputation. */
export function playerSeasonalRank(): SeasonalRank {
  const player = usePlayerStore.getState().player;
  const fans = player?.stats.fans ?? 0;
  const reputation = player?.stats.reputation ?? 50;

  // Log-scaled fame → percentile, nudged by reputation. Bounded below 100 so
  // there's always headroom to climb.
  let percentile = 8 + 12 * Math.log10(fans + 1) + (reputation - 50) / 10;
  percentile = clamp(percentile, 0, 99.8);

  const { poolSize, name } = CURRENT_GLOBAL_SEASON;
  const position = Math.max(1, Math.round(poolSize * (1 - percentile / 100)));

  return {
    seasonName: name,
    percentile: Math.round(percentile * 10) / 10,
    tier: tierForPercentile(percentile),
    position,
    poolSize,
  };
}
