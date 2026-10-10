import type {
  Platform,
  PostSentiment,
  EngagementMetrics,
  FanSegment,
  NpcAccount,
} from '../../types/social';
import { fameReach, getReputationTier } from '../../utils/statHelpers';
import { SEGMENT_INTENSITY } from './fanbase';
import { clamp } from '../../utils/random';

/**
 * PLATFORM ALGORITHMS.
 *
 * Each platform surfaces and rewards content differently — the single most
 * requested deliverable. A controversy that buries a post on the lifestyle
 * grid (VibeGram) is exactly what the discourse timeline (Chirp) boosts; the
 * short-video feed (TokTalk) hands non-followers tens of millions of views
 * the instant a clip aligns with a trend.
 *
 * `computeEngagement` is the one place the five-metric model is produced, so
 * every generator (weekly feed, infinite scroll, profile timelines) reacts to
 * audience composition, the platform algorithm, controversy, reputation, and
 * trend alignment in exactly the same way.
 */

export interface PlatformAlgorithm {
  id: Platform;
  /** Reach = followers^reachExp · reachMul (how far a post inherently travels). */
  reachExp: number;
  reachMul: number;
  /** Share of reach coming from non-followers (the "For You" discovery engine). */
  discovery: number;
  /** How hard controversy/heat multiplies reach here. */
  controversyAmp: number;
  /** How hard trend alignment multiplies reach here. */
  trendAmp: number;
  /** Impressions per unit reach — views are cheap on video, scarce on grids. */
  viewMul: number;
  /** Per-impression engagement rates, platform-tuned. */
  rates: { like: number; comment: number; repost: number; share: number };
}

export const PLATFORM_ALGORITHMS: Record<Platform, PlatformAlgorithm> = {
  // Chirp — microblogging / discourse timeline. Reposts + replies are the
  // currency; controversy is rocket fuel; visuals barely matter.
  chirper: {
    id: 'chirper',
    reachExp: 0.56,
    reachMul: 4.2,
    discovery: 0.35,
    controversyAmp: 2.3,
    trendAmp: 1.6,
    viewMul: 7,
    rates: { like: 0.12, comment: 0.05, repost: 0.06, share: 0.02 },
  },
  // VibeGram — photo / lifestyle grid. Likes dominate, discourse is thin,
  // aesthetics travel and scandal is comparatively muted.
  flashpic: {
    id: 'flashpic',
    reachExp: 0.5,
    reachMul: 3.6,
    discovery: 0.28,
    controversyAmp: 1.2,
    trendAmp: 1.35,
    viewMul: 5,
    rates: { like: 0.22, comment: 0.025, repost: 0.012, share: 0.02 },
  },
  // TokTalk — short-video virality. Discovery is enormous (followers barely
  // matter), trends decide everything, shares + views explode.
  tunetok: {
    id: 'tunetok',
    reachExp: 0.42,
    reachMul: 3.0,
    discovery: 0.85,
    controversyAmp: 1.7,
    trendAmp: 2.7,
    viewMul: 34,
    rates: { like: 0.1, comment: 0.04, repost: 0.05, share: 0.075 },
  },
  // VibeNews — industry/news. Authority-driven: huge readership, low likes,
  // controversy = engagement, shares are "story passed along".
  vibestream: {
    id: 'vibestream',
    reachExp: 0.62,
    reachMul: 4.8,
    discovery: 0.5,
    controversyAmp: 2.0,
    trendAmp: 1.4,
    viewMul: 13,
    rates: { like: 0.04, comment: 0.02, repost: 0.04, share: 0.035 },
  },
};

export function algorithmOf(platform: Platform): PlatformAlgorithm {
  return PLATFORM_ALGORITHMS[platform];
}

/** How much a sentiment inherently pushes impressions (heat). */
const SENTIMENT_HEAT: Record<PostSentiment, number> = {
  hype: 1.7,
  meme: 1.9,
  hostile: 1.6,
  shade: 1.4,
  news: 1.5,
  critical: 1.1,
  positive: 1.0,
  neutral: 0.8,
};

/** How much a sentiment skews the like/comment split (drama → comments). */
const SENTIMENT_LIKE_BIAS: Record<PostSentiment, number> = {
  hype: 1.3,
  positive: 1.2,
  meme: 1.25,
  neutral: 0.9,
  news: 0.7,
  critical: 0.6,
  shade: 0.7,
  hostile: 0.5,
};

const SENTIMENT_COMMENT_BIAS: Record<PostSentiment, number> = {
  hostile: 2.4,
  shade: 1.9,
  critical: 1.7,
  news: 1.5,
  meme: 1.4,
  neutral: 1.0,
  hype: 1.1,
  positive: 0.9,
};

export interface EngagementInput {
  platform: Platform;
  /** Author account size. */
  followers: number;
  /** The player's total fan count — bigger artist, bigger ambient audience. */
  playerFans: number;
  sentiment: PostSentiment;
  /** Active scandal heat, 0..1. */
  controversyLevel: number;
  /** Player reputation 0..100. */
  reputation: number;
  /** How aligned the post is with a hot trend, 0..1. */
  trendAlignment: number;
  /** Voicing segment — stans/toxic are louder than casuals. */
  segment?: FanSegment;
}

function jitter(spread = 0.35): number {
  return 1 - spread + Math.random() * spread * 2;
}

/**
 * The five-metric engagement model. Pure-ish (uses Math.random for spread,
 * consistent with the rest of the sim). All five platform-relevant inputs —
 * audience composition (segment + playerFans), platform algorithm, controversy
 * level, reputation, and trend alignment — flow into the result.
 */
export function computeEngagement(input: EngagementInput): EngagementMetrics {
  const algo = algorithmOf(input.platform);
  const heat = SENTIMENT_HEAT[input.sentiment];

  // Base organic reach from the author's own audience.
  const baseReach = Math.pow(input.followers + 1, algo.reachExp) * algo.reachMul;

  // The bigger the artist, the more ambient eyes any post about them draws.
  const audience = 1 + Math.min(input.playerFans / 250_000, 8);

  // Algorithmic amplifiers.
  const controversyFactor = 1 + input.controversyLevel * algo.controversyAmp;
  const trendFactor = 1 + input.trendAlignment * algo.trendAmp;
  // Discovery: when a post is hot or on-trend, the platform pushes it past the
  // author's followers — the multiplier scales with each platform's `discovery`.
  const discoveryFactor =
    1 + algo.discovery * (input.trendAlignment * 1.4 + input.controversyLevel);

  const segLoud = input.segment ? SEGMENT_INTENSITY[input.segment] : 1;

  const reach =
    baseReach *
    audience *
    heat *
    controversyFactor *
    trendFactor *
    discoveryFactor *
    segLoud;

  const views = Math.round(
    reach * algo.viewMul * relevance(input.playerFans, input.followers) * jitter()
  );

  // Reputation: a beloved artist converts views to likes; a cancelled one
  // converts them to comments/ratios instead.
  const tier = getReputationTier(input.reputation).label;
  const repLikeMul =
    tier === 'Icon' || tier === 'Beloved'
      ? 1.25
      : tier === 'Cancelled'
        ? 0.55
        : tier === 'Controversial'
          ? 0.75
          : 1.0;
  const repCommentMul =
    tier === 'Cancelled' ? 2.0 : tier === 'Controversial' ? 1.5 : 1.0;

  const likes = Math.round(
    views * algo.rates.like * SENTIMENT_LIKE_BIAS[input.sentiment] * repLikeMul * jitter(0.25)
  );
  const comments = Math.round(
    views *
      algo.rates.comment *
      SENTIMENT_COMMENT_BIAS[input.sentiment] *
      (1 + input.controversyLevel) *
      repCommentMul *
      jitter(0.3)
  );
  const reposts = Math.round(views * algo.rates.repost * (0.7 + heat * 0.3) * jitter(0.3));
  const shares = Math.round(views * algo.rates.share * trendFactor * jitter(0.3));

  return {
    likes: Math.max(0, likes),
    comments: Math.max(0, comments),
    reposts: Math.max(0, reposts),
    shares: Math.max(0, shares),
    views: Math.max(0, views),
  };
}

/**
 * How much a post about the artist travels beyond people who already care.
 * A small account's followers see it either way; a big page posting about an
 * unknown gets scrolled past. 0.12 for a nobody on a huge page, 1 for a star.
 */
export function relevance(playerFans: number, followers: number): number {
  const known = 0.12 + 0.88 * Math.pow(fameReach(playerFans), 1.5);
  const circle = 2_000 / (2_000 + Math.max(0, followers));
  return known + (1 - known) * circle;
}

/**
 * How likely each kind of account is to post about the artist. Critics and
 * blogs dig for new music and listeners pass it on, so they're the voices
 * around an unknown; stans, gossip pages, news and rival fandoms arrive once
 * there's a name to talk about.
 */
export function accountAttention(type: NpcAccount['accountType'], playerFans: number): number {
  const r = fameReach(playerFans);
  switch (type) {
    case 'critic':
      return 3.5;
    case 'fan':
      return 2;
    case 'public':
      return 1.5;
    case 'industry':
      return 0.2 + 1.8 * r * r;
    case 'stan':
      return 0.05 + 2.5 * r ** 3;
    case 'gossip':
    case 'news':
      return 0.03 + 3 * r ** 4;
    case 'rival-fan':
      return 0.03 + 2 * r ** 4;
    case 'hater':
      // A few haters find anyone; the pile-on grows with the name.
      return 0.15 + 2.2 * r ** 2;
    case 'artist':
      // Other artists only post about you when there's beef (the drama layer decides).
      return 0;
  }
}

/**
 * The accounts in the order they'd pick up the artist: a shuffle weighted by
 * `accountAttention` (each key is u^(1/w), highest first).
 */
export function byAttention(
  pool: readonly NpcAccount[],
  playerFans: number,
  rng: () => number = Math.random
): NpcAccount[] {
  return pool
    .map((a) => ({ a, k: Math.pow(rng(), 1 / accountAttention(a.accountType, playerFans)) }))
    .sort((x, y) => y.k - x.k)
    .map((x) => x.a);
}

/**
 * An unknown's music is met by critics and the curious, not a fandom: tilt a
 * feed's sentiment weights toward critical and neutral, away from hype and
 * memes, fading out as the artist gets known. Returns a new record.
 */
export function withFameTone(
  weights: Record<PostSentiment, number>,
  playerFans: number
): Record<PostSentiment, number> {
  const fresh = 1 - fameReach(playerFans);
  return {
    ...weights,
    critical: weights.critical + 8 * fresh,
    neutral: weights.neutral + 5 * fresh,
    hype: weights.hype * (1 - 0.6 * fresh),
    meme: weights.meme * (1 - 0.6 * fresh),
  };
}

/**
 * Map the raw social-reaction signal of the week into a 0..1 controversy
 * level the engagement + feed layers consume.
 */
export function controversyFromReactions(
  reactions: Array<'positive' | 'negative' | 'mixed' | 'neutral' | 'viral' | 'cancel' | 'none'>,
  reputation: number
): number {
  let c = 0;
  for (const r of reactions) {
    if (r === 'cancel') c += 0.5;
    else if (r === 'negative') c += 0.3;
    else if (r === 'mixed') c += 0.15;
  }
  // A fragile reputation makes the same week read as more controversial.
  const repPenalty = clamp((50 - reputation) / 100, 0, 0.4);
  return clamp(c + repPenalty, 0, 1);
}
