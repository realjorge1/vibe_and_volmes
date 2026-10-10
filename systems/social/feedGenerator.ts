import type {
  SocialPost,
  PostSentiment,
  Platform,
  NpcAccount,
  TrendingTopic,
  FanbaseComposition,
} from '../../types/social';
import type { Player } from '../../types/player';
import type { SocialReactionType } from '../../types/events';
import type { Track } from '../../types/music';
import { TEMPLATES_BY_SENTIMENT, type PostTemplate } from '../../data/social/postTemplates';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { platformOf } from '../../data/social/platforms';
import { buildMedia } from '../../data/social/mediaTemplates';
import { getReputationTier } from '../../utils/statHelpers';
import { getGenre } from '../../data/genres';
import { pick, randInt, weightedPickKey, chance } from '../../utils/random';
import {
  deriveFanbase,
  fanbaseSentimentWeights,
  accountToSegment,
} from './fanbase';
import {
  byAttention,
  computeEngagement,
  controversyFromReactions,
  withFameTone,
} from './platformAlgorithms';
import { trendAlignmentFor } from './trendEngine';
import type { DiscourseInput } from '../drama/discourse';
import { dramaPosts, dramaShare } from '../drama/feed';
import { interleave, laneCounts, type LaneInput } from './lanes';
import { everydayPosts } from './everyday';
import { celebPosts } from './celebFeed';

export interface FeedInput {
  player: Player;
  week: number;
  recentReactions: SocialReactionType[];
  recentEventIds: string[];
  latestTrack: Track | null;
  /** This week's trend board — drives per-post discovery reach. */
  trending?: TrendingTopic[];
  postCount?: number;
  /** The drama layer's view of the artist's week (moments, rival, romance). */
  discourse?: DiscourseInput | null;
  /** The rest of the internet: everyday life and other artists (sized by fame, see lanes.ts). */
  lanes?: LaneInput | null;
}

const ACCOUNT_SENTIMENT_BIAS: Record<NpcAccount['accountType'], PostSentiment[]> = {
  stan: ['hype', 'hype', 'positive'],
  fan: ['positive', 'hype', 'neutral'],
  critic: ['critical', 'neutral', 'positive'],
  gossip: ['shade', 'news', 'neutral'],
  'rival-fan': ['hostile', 'shade', 'critical'],
  industry: ['news', 'neutral', 'positive'],
  public: ['neutral', 'meme', 'positive'],
  news: ['news', 'news', 'neutral'],
  hater: ['hostile', 'critical', 'shade'],
  artist: ['shade', 'hype', 'shade'],
};

/** Reaction from the last week's decisions skews the whole feed. */
function reactionSentimentWeights(
  reactions: SocialReactionType[]
): Record<PostSentiment, number> {
  const w: Record<PostSentiment, number> = {
    hype: 4, positive: 8, neutral: 12, critical: 5,
    hostile: 2, meme: 4, news: 3, shade: 3,
  };
  for (const r of reactions) {
    if (r === 'positive') { w.positive += 8; w.hype += 4; }
    else if (r === 'negative') { w.critical += 7; w.hostile += 3; }
    else if (r === 'viral') { w.hype += 12; w.meme += 8; w.news += 4; }
    else if (r === 'cancel') { w.hostile += 14; w.shade += 8; w.critical += 6; }
    else if (r === 'mixed') { w.critical += 4; w.neutral += 4; w.shade += 3; }
  }
  return w;
}

/** Reputation tier nudges baseline tone. */
function reputationSentimentBias(reputation: number): Partial<Record<PostSentiment, number>> {
  const tier = getReputationTier(reputation).label;
  switch (tier) {
    case 'Cancelled': return { hostile: 16, shade: 10, critical: 8 };
    case 'Controversial': return { critical: 8, shade: 6, hostile: 4 };
    case 'Polarizing': return { critical: 4, hype: 4, meme: 4 };
    case 'Respected': return { positive: 6, neutral: 4 };
    case 'Beloved': return { positive: 10, hype: 6 };
    case 'Icon': return { hype: 14, positive: 8, news: 4 };
    default: return {};
  }
}

function fillTemplate(tpl: string, player: Player, track: Track | null): string {
  return tpl
    .replace(/\{playerName\}/g, player.artistName)
    .replace(/\{trackTitle\}/g, track?.title ?? 'the new one')
    .replace(/\{genre\}/g, getGenre(player.genre).label)
    .replace(/\{event\}/g, 'the news')
    .replace(/\{opportunity\}/g, 'a major move');
}

function eligibleTemplate(
  sentiment: PostSentiment,
  player: Player,
  tags: string[],
  track: Track | null
): PostTemplate | null {
  const pool = TEMPLATES_BY_SENTIMENT[sentiment].filter((t) => {
    if (t.minFans !== undefined && player.stats.fans < t.minFans) return false;
    if (t.requiresTag === 'has-track' && !track) return false;
    if (
      t.requiresTag &&
      t.requiresTag !== 'has-track' &&
      !tags.includes(t.requiresTag)
    ) {
      return false;
    }
    return true;
  });
  return pool.length > 0 ? pick(pool) : null;
}

/** Probability a post on a platform carries image/video media. */
function mediaKindFor(platform: Platform): 'image' | 'video' | null {
  const vibe = platformOf(platform).vibe;
  if (vibe === 'visual') return chance(0.75) ? 'image' : null;
  if (vibe === 'viral') return chance(0.8) ? 'video' : null;
  if (vibe === 'timeline') return chance(0.15) ? 'image' : null;
  return chance(0.08) ? 'image' : null; // news platform: rare
}

/**
 * Build the weekly canonical feed. Engagement now flows through the platform
 * algorithms, sentiment is shaped by the actual fanbase composition (so a
 * stan-heavy audience floods hype while a casual one stays muted), and posts
 * on visual/viral platforms carry media descriptions.
 */
export function generateFeed(input: FeedInput): SocialPost[] {
  const { player, week, recentReactions, recentEventIds, latestTrack } = input;
  const trending = input.trending ?? [];
  const tags: string[] = [];

  // Fanbase-aware mood: blend last week's reaction, reputation, and how each
  // audience segment reads the week.
  const controversyLevel = controversyFromReactions(
    recentReactions,
    player.stats.reputation
  );
  const composition: FanbaseComposition = deriveFanbase(player, {
    dramaHeat: controversyLevel,
  });

  let baseWeights = reactionSentimentWeights(recentReactions);
  const repBias = reputationSentimentBias(player.stats.reputation);
  for (const [k, v] of Object.entries(repBias)) {
    baseWeights[k as PostSentiment] += v ?? 0;
  }
  const fanWeights = fanbaseSentimentWeights(composition, recentReactions);
  for (const [k, v] of Object.entries(fanWeights)) {
    // Scale so segment voice meaningfully colors, but doesn't dominate, the mood.
    baseWeights[k as PostSentiment] += (v ?? 0) * 1.4;
  }
  baseWeights = withFameTone(baseWeights, player.stats.fans);

  const total = input.postCount ?? randInt(10, 16);
  // Part of the week's feed is about the specific drama in the artist's life.
  const dramaCount = input.discourse ? Math.round(total * dramaShare(player.stats.fans)) : 0;
  const target = total - dramaCount;
  // Who's talking depends on who the artist is: critics and listeners find an
  // unknown first, the big pages come later.
  const accountPool = byAttention(NPC_ACCOUNTS, player.stats.fans);
  const posts: SocialPost[] = [];

  for (let i = 0; i < target; i++) {
    const account = accountPool[i % accountPool.length];

    // Blend feed-wide mood with this account's natural lean.
    const accountLean = pick(ACCOUNT_SENTIMENT_BIAS[account.accountType]);
    const sentiment = chance(0.55)
      ? (weightedPickKey(baseWeights) as PostSentiment)
      : accountLean;

    const tpl = eligibleTemplate(sentiment, player, tags, latestTrack);
    if (!tpl) continue;

    const platform: Platform = pick(account.preferredPlatforms);
    const fanSegment = accountToSegment(account.accountType, composition);
    const trendAlignment = trendAlignmentFor(sentiment, trending);

    const eng = computeEngagement({
      platform,
      followers: account.followers,
      playerFans: player.stats.fans,
      sentiment,
      controversyLevel,
      reputation: player.stats.reputation,
      trendAlignment,
      segment: fanSegment,
    });

    const kind = mediaKindFor(platform);
    const media = kind
      ? buildMedia(kind, sentiment, {
          playerName: player.artistName,
          trackTitle: latestTrack?.title ?? 'the new one',
          genre: getGenre(player.genre).label,
        })
      : undefined;

    const relatedEventId =
      recentEventIds.length > 0 && chance(0.35)
        ? pick(recentEventIds)
        : undefined;

    posts.push({
      id: `post-${week}-${i}-${Date.now()}`,
      platform,
      account,
      content: fillTemplate(tpl.template, player, latestTrack),
      sentiment,
      likes: eng.likes,
      reposts: eng.reposts,
      replies: eng.comments,
      shares: eng.shares,
      views: eng.views,
      media,
      fanSegment,
      week,
      relatedEventId,
    });
  }

  // Rank by views — the platform-agnostic measure of how far a post traveled.
  if (input.discourse && dramaCount > 0) {
    posts.push(
      ...dramaPosts(input.discourse, {
        player,
        week,
        count: dramaCount,
        controversy: controversyLevel,
        idPrefix: `drama-${week}`,
      })
    );
  }

  const about = posts.sort((a, b) => (b.views ?? b.likes) - (a.views ?? a.likes));
  if (!input.lanes) return about;
  // Most of a feed isn't about the artist: the rest of the internet goes around their posts.
  const n = laneCounts(about.length, player.stats.fans);
  const others = [
    ...everydayPosts({ week, baseYear: input.lanes.baseYear, city: input.lanes.city, count: n.everyday, idPrefix: `ev-${week}`, real: input.lanes.real }),
    ...(input.lanes.celeb ? celebPosts(input.lanes.celeb, { count: n.celeb, idPrefix: `cl-${week}` }) : []),
  ];
  return interleave(about, others);
}
