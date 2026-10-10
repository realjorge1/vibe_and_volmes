import type { EngagementMetrics, Platform } from '../../types/social';
import type { CelebInput } from './celebFeed';
import type { RealTopic } from '../../types/realworld';
import { fameReach } from '../../utils/statHelpers';

/**
 * WHAT A FEED IS MADE OF.
 *
 * A real feed is mostly not about you. An unknown artist scrolls through
 * memes, food, sports and friends, a bit of celebrity news, and the odd post
 * about themselves; a superstar's feed is still half the world, but a lot
 * more of it is about them. Three lanes:
 *   everyday - the regular internet (systems/social/everyday)
 *   celeb    - other artists, their lovers and their haters (systems/social/celebFeed)
 *   you      - posts about the player (the original feed + the drama layer)
 */

export interface FeedMix {
  everyday: number;
  celeb: number;
  you: number;
}

/** Shares of each lane (they sum to 1): ~68/14/18 for an unknown, ~35/25/40 for a superstar. */
export function feedMix(fans: number): FeedMix {
  const r = fameReach(fans);
  const everyday = 0.68 - 0.33 * r;
  const celeb = 0.14 + 0.11 * r;
  return { everyday, celeb, you: 1 - everyday - celeb };
}

/** Whole posts per lane for a feed of `total`. */
export function splitCount(total: number, mix: FeedMix, rnd: () => number = Math.random): { everyday: number; celeb: number; you: number } {
  const exact = { everyday: total * mix.everyday, celeb: total * mix.celeb, you: total * mix.you };
  const out = { everyday: Math.floor(exact.everyday), celeb: Math.floor(exact.celeb), you: Math.floor(exact.you) };
  let left = total - out.everyday - out.celeb - out.you;
  // Hand the remainder out by the fractional parts, ties broken at random.
  const order = (['everyday', 'celeb', 'you'] as const)
    .map((k) => ({ k, f: exact[k] - out[k] + rnd() * 1e-6 }))
    .sort((a, b) => b.f - a.f);
  for (const { k } of order) {
    if (left <= 0) break;
    out[k]++;
    left--;
  }
  return out;
}

/**
 * Lane posts the weekly feed adds around the player's `youCount` posts, so
 * the player's share lands where `feedMix` puts it (capped: a week's feed
 * stays a few dozen posts).
 */
export function laneCounts(youCount: number, fans: number, cap = 48): { everyday: number; celeb: number } {
  const mix = feedMix(fans);
  const lanes = Math.min(cap, Math.round((youCount * (1 - mix.you)) / Math.max(0.05, mix.you)));
  const celeb = Math.round((lanes * mix.celeb) / (mix.celeb + mix.everyday));
  return { everyday: lanes - celeb, celeb };
}

const VIEWS_PER_LIKE: Record<Platform, readonly [number, number]> = {
  chirper: [15, 60],
  flashpic: [8, 22],
  tunetok: [12, 45],
  vibestream: [30, 120],
};

/**
 * Engagement for a post that isn't about the player: it depends on the
 * poster's own following, not the player's fame. Now and then one goes viral.
 */
export function laneEngagement(followers: number, platform: Platform, rnd: () => number = Math.random): EngagementMetrics {
  const rate = 0.004 + rnd() * 0.05;
  let likes = Math.round(Math.max(3, followers) * rate * (0.5 + rnd()));
  if (rnd() < 0.03) likes = Math.round(likes * (4 + rnd() * 12));
  likes = Math.max(rnd() < 0.15 ? 0 : 1, likes);
  const [lo, hi] = VIEWS_PER_LIKE[platform];
  return {
    likes,
    comments: Math.round(likes * (0.015 + rnd() * 0.05)),
    reposts: Math.round(likes * (platform === 'chirper' ? 0.06 + rnd() * 0.14 : 0.005 + rnd() * 0.02)),
    shares: Math.round(likes * (0.01 + rnd() * 0.07)),
    views: Math.round(likes * (lo + rnd() * (hi - lo))) + Math.round(rnd() * 40),
  };
}

/** Scatter `extra` posts through `base` so the scroll never comes in blocks. */
export function interleave<T>(base: readonly T[], extra: readonly T[], rnd: () => number = Math.random): T[] {
  const out = [...base];
  for (const p of extra) out.splice(Math.floor(rnd() * (out.length + 1)), 0, p);
  return out;
}

/** What a feed generator needs to add the other lanes (null = posts about the player only). */
export interface LaneInput {
  baseYear: number;
  city: string;
  celeb: CelebInput | null;
  /** What's happening in the real world (systems/realworld), empty when switched off. */
  real?: readonly RealTopic[];
}

/** A unique, stable-looking id for a generated lane post. */
export function laneId(prefix: string, lane: string, i: number, rnd: () => number): string {
  return `${prefix}-${lane}-${i}-${Math.floor(rnd() * 2 ** 31).toString(36)}`;
}
