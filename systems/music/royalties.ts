import type { Track } from '../../types/music';

/**
 * Streams pay. Pure.
 *
 * Every stream earns the rights holders STREAM_RATE; the artist keeps the
 * song's `royaltyShare` of that. An independent artist keeps most of it (a
 * distributor takes a cut); a label deal pays a royalty rate; a label that
 * owns the masters keeps paying that same small rate forever, even after
 * the deal ends — which is what makes owning your masters worth fighting for.
 */

/** Dollars per stream to the rights holders. */
export const STREAM_RATE = 0.003;
/** What an independent artist keeps after the distributor's cut. */
export const INDIE_SHARE = 0.85;
/** What the artist keeps on their own label. */
export const OWN_LABEL_SHARE = 1;

export function shareOf(track: Track): number {
  return track.royaltyShare ?? INDIE_SHARE;
}

/** The artist's money from one song this week. */
export function trackRoyalty(track: Track): number {
  return Math.round(track.weeklyStreams * STREAM_RATE * shareOf(track));
}

/** What whoever owns the master keeps from one song this week. */
export function ownerCut(track: Track): number {
  return Math.round(track.weeklyStreams * STREAM_RATE * (1 - shareOf(track)));
}

export interface RoyaltyStatement {
  total: number;
  streams: number;
  /** What labels and buyers kept from the artist's own songs. */
  withheld: number;
  byTrack: { id: string; title: string; amount: number }[];
}

export function weeklyRoyalties(tracks: Track[]): RoyaltyStatement {
  let total = 0;
  let streams = 0;
  let withheld = 0;
  const byTrack: RoyaltyStatement['byTrack'] = [];
  for (const t of tracks) {
    if (t.weeklyStreams <= 0) continue;
    const amount = trackRoyalty(t);
    total += amount;
    streams += t.weeklyStreams;
    withheld += ownerCut(t);
    if (amount > 0) byTrack.push({ id: t.id, title: t.title, amount });
  }
  byTrack.sort((a, b) => b.amount - a.amount);
  return { total, streams, withheld, byTrack };
}

/** Songs a label or a buyer still owns (re-recorded ones are reclaimed). */
export function heldMasters(tracks: Track[]): Track[] {
  return tracks.filter((t) => (t.owner === 'label' || t.owner === 'vault') && !t.rerecorded);
}

/**
 * What it costs to buy the masters back: about two years of what the owner
 * makes from them, plus a premium for the hits (owners price in the future).
 */
export function buybackPrice(tracks: Track[]): number {
  const held = heldMasters(tracks);
  if (held.length === 0) return 0;
  const yearly = held.reduce((sum, t) => sum + ownerCut(t), 0) * 24;
  const premium = held.reduce((sum, t) => {
    const peak = t.peakChartPosition;
    if (peak !== null && peak <= 10) return sum + 120_000;
    if (peak !== null && peak <= 40) return sum + 35_000;
    return sum + 8_000;
  }, 0);
  return Math.round(Math.max(25_000, yearly + premium) / 1000) * 1000;
}

/** Weekly royalties an artist-owned catalog would pay, for an estate. */
export function ownedCatalogWeekly(tracks: Track[]): number {
  return tracks
    .filter((t) => (t.owner ?? 'artist') === 'artist')
    .reduce((sum, t) => sum + trackRoyalty(t), 0);
}
