import type { WrappedCard, YearSnapshot } from '../../types/calendar';
import type { Track } from '../../types/music';

/**
 * Wrapped: the year in numbers, the moment the year turns. Pure: the glue
 * passes in the year's opening snapshot and what the stores hold now.
 */

export interface WrappedInput {
  start: YearSnapshot;
  age: number;
  fans: number;
  lifetimeEarnings: number;
  tracks: Track[];
  showScores: number[];
  awardsWon: number;
  nominations: number;
  biggestMoment: string | null;
  /** The artist's rank by fans among the world's artists, 1-based, and how many there are. */
  rank: { position: number; of: number };
  newPeople: string[];
  wantsMet: number;
}

export function rankLine(position: number, of: number): string {
  if (of <= 0) return 'Still finding your people.';
  const pct = (position / of) * 100;
  if (position === 1) return 'The biggest artist in the world this year.';
  if (pct <= 1) return 'Top 1% of artists this year.';
  if (pct <= 5) return `Top ${Math.max(2, Math.ceil(pct))}% of artists this year.`;
  if (pct <= 25) return `Top ${Math.ceil(pct / 5) * 5}% of artists this year.`;
  if (pct <= 60) return 'Somewhere in the middle of the pack. For now.';
  return 'Most of the world hasn’t heard you yet. That is what next year is for.';
}

export function buildWrapped(input: WrappedInput): WrappedCard {
  const { start } = input;
  const yearTracks = input.tracks.map((t) => ({
    t,
    streams: Math.max(0, t.totalStreams - (start.trackStreams[t.id] ?? 0)),
  }));
  const streams = yearTracks.reduce((s, x) => s + x.streams, 0);
  const top = [...yearTracks].sort((a, b) => b.streams - a.streams)[0];
  const released = input.tracks.filter((t) => t.releasedAtWeek >= start.week);
  const peaks = released.map((t) => t.peakChartPosition).filter((p): p is number => p !== null);
  return {
    year: start.year,
    age: input.age,
    streams,
    fansGained: input.fans - start.fans,
    earned: Math.max(0, input.lifetimeEarnings - start.lifetimeEarnings),
    topSong: top && top.streams > 0 ? { title: top.t.title, streams: top.streams } : null,
    releases: released.length,
    bestPeak: peaks.length > 0 ? Math.min(...peaks) : null,
    showsPlayed: input.showScores.length,
    bestShow: input.showScores.length > 0 ? Math.max(...input.showScores) : null,
    awardsWon: input.awardsWon,
    nominations: input.nominations,
    biggestMoment: input.biggestMoment,
    rankLine: rankLine(input.rank.position, input.rank.of),
    newPeople: input.newPeople.slice(0, 4),
    wantsMet: input.wantsMet,
    seen: false,
  };
}
