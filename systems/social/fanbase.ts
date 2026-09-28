import type {
  FanSegment,
  FanbaseComposition,
  PostSentiment,
  AccountType,
} from '../../types/social';
import type { Player } from '../../types/player';
import type { SocialReactionType } from '../../types/events';
import { getFameLevelNumber, getReputationTier } from '../../utils/statHelpers';
import { getGenre } from '../../data/genres';
import { clamp } from '../../utils/random';

/**
 * FANBASE SEGMENTATION.
 *
 * A fanbase is not a single number of "fans" — it is a *composition* of
 * segments that each read the same event through their own lens. This module
 * is the deterministic backbone the feed/engagement layers read from:
 *
 *   deriveFanbase(player)   → who the audience actually is (shares + counts)
 *   segmentReaction(seg, r) → how THAT segment reacts to this week's event
 *   fanbaseSentimentWeights → the blended feed mood across all segments
 *
 * Nothing here is random: identical player state → identical composition, so
 * it is safe to call on every render and inside the seeded AI path.
 */

export const FAN_SEGMENTS: FanSegment[] = [
  'hardcore',
  'casual',
  'stan',
  'toxic',
  'local',
  'international',
];

export const SEGMENT_LABEL: Record<FanSegment, string> = {
  hardcore: 'Hardcore',
  casual: 'Casual',
  stan: 'Stans',
  toxic: 'Toxic',
  local: 'Local',
  international: 'International',
};

export const SEGMENT_EMOJI: Record<FanSegment, string> = {
  hardcore: '🛡️',
  casual: '🎧',
  stan: '🔥',
  toxic: '☠️',
  local: '📍',
  international: '🌍',
};

/**
 * Which NPC account archetypes give a given segment its voice in the feed.
 * Only genuine audience archetypes map here — critics/gossip/industry/news are
 * media, not the player's fanbase, so they never carry a fan segment.
 */
export const SEGMENT_VOICE: Record<FanSegment, AccountType[]> = {
  hardcore: ['fan', 'stan'],
  casual: ['public', 'fan'],
  stan: ['stan'],
  toxic: ['rival-fan'],
  local: ['fan', 'public'],
  international: ['fan', 'stan', 'public'],
};

/** A "global reach" proxy per genre (0..1) — Latin/Pop/Electronic travel far. */
function globalReachOf(player: Player): number {
  const g = getGenre(player.genre);
  return clamp((g.mainstreamScore + g.viralPotential) / 20, 0, 1);
}

export interface FanbaseOpts {
  /** Active scandal heat 0..1 — swells the toxic + casual-churn dynamics. */
  dramaHeat?: number;
}

/**
 * Derive the audience composition purely from player state. Raw segment
 * weights are normalized to shares that sum to 1, then multiplied by the raw
 * fan count for headcounts.
 */
export function deriveFanbase(
  player: Player,
  opts: FanbaseOpts = {}
): FanbaseComposition {
  const s = player.stats;
  const loyalty = s.fanLoyalty / 100;
  const rep = s.reputation / 100;
  const cha = s.charisma / 100;
  const auth = s.authenticity / 100;
  const fameFrac = getFameLevelNumber(s.fans) / 9; // 0..1
  const viral = getGenre(player.genre).viralPotential / 10;
  const global = globalReachOf(player);
  const drama = clamp(opts.dramaHeat ?? 0, 0, 1);

  const raw: Record<FanSegment, number> = {
    hardcore: 0.18 + loyalty * 0.5 + auth * 0.2,
    casual: 0.3 + fameFrac * 0.5 - loyalty * 0.25 + drama * 0.1,
    stan: 0.1 + loyalty * 0.35 + cha * 0.25 + viral * 0.2,
    toxic: 0.04 + (1 - rep) * 0.35 + fameFrac * 0.25 + drama * 0.3,
    local: 0.22 + (1 - fameFrac) * 0.5 - global * 0.12,
    international: 0.08 + fameFrac * 0.45 + global * 0.3,
  };

  // Floor each so no segment vanishes entirely, then normalize to shares.
  let sum = 0;
  for (const k of FAN_SEGMENTS) {
    raw[k] = Math.max(0.01, raw[k]);
    sum += raw[k];
  }

  const shares = {} as Record<FanSegment, number>;
  const counts = {} as Record<FanSegment, number>;
  for (const k of FAN_SEGMENTS) {
    shares[k] = raw[k] / sum;
    counts[k] = Math.round(shares[k] * s.fans);
  }

  return { shares, counts, total: s.fans };
}

export interface SegmentReaction {
  /** Sentiment weights this segment pushes into the feed for the event. */
  weights: Partial<Record<PostSentiment, number>>;
  /** How loud the segment is (engagement multiplier, ~0.6..2.4). */
  intensity: number;
  /** Fan pressure −1..1: stans/hardcore rally, casuals bleed on drama. */
  loyaltyShift: number;
}

/**
 * The heart of "different segments react differently to the same event."
 * Given the week's overall social reaction, return how a specific segment
 * voices it. Same `reaction` in, six different reads out.
 */
export function segmentReaction(
  segment: FanSegment,
  reaction: SocialReactionType
): SegmentReaction {
  const neg = reaction === 'negative' || reaction === 'cancel';
  const pos = reaction === 'positive' || reaction === 'viral';

  switch (segment) {
    case 'hardcore':
      // The loyal core: hype on wins, *defensive positivity* through scandal.
      if (neg) return { weights: { positive: 5, neutral: 4, hype: 2 }, intensity: 1.3, loyaltyShift: 0.05 };
      if (pos) return { weights: { hype: 8, positive: 6 }, intensity: 1.5, loyaltyShift: 0.12 };
      return { weights: { positive: 6, hype: 3, neutral: 4 }, intensity: 1.1, loyaltyShift: 0.04 };

    case 'casual':
      // Passive majority: amplifies hits, quietly churns at the first drama.
      if (neg) return { weights: { neutral: 6, critical: 4 }, intensity: 0.6, loyaltyShift: -0.18 };
      if (pos) return { weights: { positive: 6, neutral: 3, meme: 2 }, intensity: 1.0, loyaltyShift: 0.06 };
      return { weights: { neutral: 8, positive: 3 }, intensity: 0.7, loyaltyShift: 0 };

    case 'stan':
      // Online warriors: maximal volume, weaponize everything into hype/shade.
      if (neg) return { weights: { hype: 6, shade: 6, hostile: 3 }, intensity: 2.4, loyaltyShift: 0.1 };
      if (pos) return { weights: { hype: 12, meme: 5 }, intensity: 2.4, loyaltyShift: 0.14 };
      return { weights: { hype: 8, positive: 4, meme: 3 }, intensity: 1.9, loyaltyShift: 0.08 };

    case 'toxic':
      // Antagonists: thrive on outrage, pour fuel on any pile-on.
      if (neg) return { weights: { hostile: 12, shade: 8, critical: 5 }, intensity: 2.2, loyaltyShift: -0.08 };
      if (pos) return { weights: { shade: 6, critical: 5, meme: 3 }, intensity: 1.4, loyaltyShift: -0.03 };
      return { weights: { shade: 6, critical: 5, hostile: 3 }, intensity: 1.5, loyaltyShift: -0.04 };

    case 'local':
      // Hometown pride: steady, supportive, takes shots at the artist personally.
      if (neg) return { weights: { positive: 4, neutral: 5, critical: 3 }, intensity: 0.9, loyaltyShift: -0.04 };
      if (pos) return { weights: { positive: 8, hype: 4 }, intensity: 1.2, loyaltyShift: 0.1 };
      return { weights: { positive: 6, neutral: 4 }, intensity: 0.9, loyaltyShift: 0.03 };

    case 'international':
      // Global/algorithm-driven: rides trends + memes, fickle on controversy.
      if (neg) return { weights: { meme: 5, neutral: 5, critical: 3 }, intensity: 1.1, loyaltyShift: -0.1 };
      if (pos) return { weights: { hype: 7, meme: 6, news: 2 }, intensity: 1.6, loyaltyShift: 0.09 };
      return { weights: { meme: 6, neutral: 4, hype: 3 }, intensity: 1.2, loyaltyShift: 0.02 };
  }
}

/**
 * Blend the whole audience into feed-wide sentiment weights: each segment's
 * reaction is scaled by its share so a stan-heavy fanbase floods hype while a
 * casual-heavy one stays muted. This is what the feed generator samples from.
 */
export function fanbaseSentimentWeights(
  composition: FanbaseComposition,
  reactions: SocialReactionType[]
): Partial<Record<PostSentiment, number>> {
  const out: Partial<Record<PostSentiment, number>> = {};
  const rs: SocialReactionType[] = reactions.length ? reactions : ['neutral'];

  for (const seg of FAN_SEGMENTS) {
    const share = composition.shares[seg];
    for (const r of rs) {
      const { weights, intensity } = segmentReaction(seg, r);
      for (const [k, v] of Object.entries(weights)) {
        const key = k as PostSentiment;
        out[key] = (out[key] ?? 0) + (v ?? 0) * share * intensity;
      }
    }
  }
  return out;
}

/**
 * Net fan-loyalty pressure from an event across the whole composition — the
 * progression layer can read this to move `fanLoyalty` after a dramatic week.
 */
export function fanbaseLoyaltyShift(
  composition: FanbaseComposition,
  reactions: SocialReactionType[]
): number {
  let shift = 0;
  for (const seg of FAN_SEGMENTS) {
    for (const r of reactions) {
      shift += segmentReaction(seg, r).loyaltyShift * composition.shares[seg];
    }
  }
  return shift;
}

/** How fierce/loud each segment is by default — engagement multiplier. */
export const SEGMENT_INTENSITY: Record<FanSegment, number> = {
  hardcore: 1.25,
  casual: 0.7,
  stan: 2.1,
  toxic: 1.7,
  local: 0.95,
  international: 1.35,
};

/**
 * Attribute a fan-authored post to a segment, weighted by composition so the
 * loudest/largest segments show up most. Returns undefined for non-fan voices
 * (news, industry, critics — they don't belong to the player's fanbase).
 */
export function accountToSegment(
  accountType: AccountType,
  composition: FanbaseComposition
): FanSegment | undefined {
  const candidates = FAN_SEGMENTS.filter((seg) =>
    SEGMENT_VOICE[seg].includes(accountType)
  );
  if (candidates.length === 0) return undefined;

  // Weight by each candidate segment's share × loudness.
  let total = 0;
  const weighted = candidates.map((seg) => {
    const w = composition.shares[seg] * SEGMENT_INTENSITY[seg];
    total += w;
    return { seg, w };
  });
  let r = Math.random() * total;
  for (const { seg, w } of weighted) {
    r -= w;
    if (r <= 0) return seg;
  }
  return candidates[candidates.length - 1];
}

/** A one-line "state of the fandom" derived from composition + reputation. */
export function fanbaseSummary(
  composition: FanbaseComposition,
  player: Player
): string {
  const dominant = FAN_SEGMENTS.reduce((a, b) =>
    composition.shares[a] >= composition.shares[b] ? a : b
  );
  const tier = getReputationTier(player.stats.reputation).label;
  const pct = Math.round(composition.shares[dominant] * 100);
  return `${pct}% ${SEGMENT_LABEL[dominant]} · ${tier}`;
}
