import type { SocialPost, PostSentiment, Platform, NpcAccount } from '../../types/social';
import type { Player } from '../../types/player';
import type { Track } from '../../types/music';
import { TEMPLATES_BY_SENTIMENT } from '../../data/social/postTemplates';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { platformOf } from '../../data/social/platforms';
import { buildMedia } from '../../data/social/mediaTemplates';
import { getReputationTier } from '../../utils/statHelpers';
import { genreLabel } from '../../utils/formatters';
import { pick, weightedPickKey, chance, randInt, shuffle } from '../../utils/random';
import { deriveFanbase, accountToSegment } from './fanbase';
import { computeEngagement } from './platformAlgorithms';

/**
 * A reusable post factory. The weekly `feedGenerator` still seeds the
 * canonical feed; this powers the *infinite scroll*, profile timelines,
 * and thread replies — same template corpus, platform-locked, generated
 * lazily so the feed never ends. Engagement runs through the same platform
 * algorithms as the weekly feed for consistent five-metric numbers.
 */

const ACCOUNT_LEAN: Record<NpcAccount['accountType'], PostSentiment[]> = {
  stan: ['hype', 'hype', 'positive'],
  fan: ['positive', 'hype', 'neutral'],
  critic: ['critical', 'neutral', 'positive'],
  gossip: ['shade', 'news', 'neutral'],
  'rival-fan': ['hostile', 'shade', 'critical'],
  industry: ['news', 'neutral', 'positive'],
  public: ['neutral', 'meme', 'positive'],
  news: ['news', 'news', 'neutral'],
};

function repWeights(reputation: number): Record<PostSentiment, number> {
  const w: Record<PostSentiment, number> = {
    hype: 5, positive: 9, neutral: 11, critical: 5,
    hostile: 2, meme: 5, news: 4, shade: 3,
  };
  const tier = getReputationTier(reputation).label;
  if (tier === 'Cancelled') { w.hostile += 16; w.shade += 9; w.critical += 7; }
  else if (tier === 'Controversial') { w.critical += 8; w.shade += 6; }
  else if (tier === 'Polarizing') { w.critical += 4; w.hype += 5; w.meme += 4; }
  else if (tier === 'Respected') { w.positive += 6; }
  else if (tier === 'Beloved') { w.positive += 11; w.hype += 6; }
  else if (tier === 'Icon') { w.hype += 15; w.positive += 8; w.news += 4; }
  return w;
}

function fill(tpl: string, player: Player, track: Track | null): string {
  return tpl
    .replace(/\{playerName\}/g, player.artistName)
    .replace(/\{trackTitle\}/g, track?.title ?? 'the new one')
    .replace(/\{genre\}/g, genreLabel(player.genre))
    .replace(/\{event\}/g, 'the news')
    .replace(/\{opportunity\}/g, 'a major move');
}

function eligible(sentiment: PostSentiment, player: Player, track: Track | null) {
  const pool = TEMPLATES_BY_SENTIMENT[sentiment].filter((t) => {
    if (t.minFans !== undefined && player.stats.fans < t.minFans) return false;
    if (t.requiresTag === 'has-track' && !track) return false;
    if (t.requiresTag && t.requiresTag !== 'has-track') return false;
    return true;
  });
  return pool.length ? pick(pool) : null;
}

function mediaKindFor(platform: Platform): 'image' | 'video' | null {
  const vibe = platformOf(platform).vibe;
  if (vibe === 'visual') return chance(0.7) ? 'image' : null;
  if (vibe === 'viral') return chance(0.75) ? 'video' : null;
  if (vibe === 'timeline') return chance(0.12) ? 'image' : null;
  return null;
}

export interface StreamOpts {
  player: Player;
  week: number;
  platform: Platform;
  track: Track | null;
  count: number;
  /** Stable-ish offset so paged ids don't collide. */
  page: number;
}

/** Generate the next page of posts for a single platform's infinite feed. */
export function streamMorePosts(opts: StreamOpts): SocialPost[] {
  const { player, week, platform, track, count, page } = opts;
  const weights = repWeights(player.stats.reputation);
  const composition = deriveFanbase(player);
  const accounts = shuffle(
    NPC_ACCOUNTS.filter((a) => a.preferredPlatforms.includes(platform))
  );
  const out: SocialPost[] = [];
  for (let i = 0; i < count; i++) {
    const account = accounts[i % accounts.length] ?? pick(NPC_ACCOUNTS);
    const lean = pick(ACCOUNT_LEAN[account.accountType]);
    const sentiment = chance(0.5)
      ? (weightedPickKey(weights) as PostSentiment)
      : lean;
    const tpl = eligible(sentiment, player, track);
    if (!tpl) continue;
    const fanSegment = accountToSegment(account.accountType, composition);
    const eng = computeEngagement({
      platform,
      followers: account.followers,
      playerFans: player.stats.fans,
      sentiment,
      controversyLevel: getReputationTier(player.stats.reputation).label === 'Cancelled' ? 0.5 : 0.1,
      reputation: player.stats.reputation,
      trendAlignment: 0,
      segment: fanSegment,
    });
    const kind = mediaKindFor(platform);
    const media = kind
      ? buildMedia(kind, sentiment, {
          playerName: player.artistName,
          trackTitle: track?.title ?? 'the new one',
          genre: genreLabel(player.genre),
        })
      : undefined;
    out.push({
      id: `stream-${platform}-${page}-${i}-${Date.now()}-${randInt(0, 9999)}`,
      platform,
      account,
      content: fill(tpl.template, player, track),
      sentiment,
      likes: eng.likes,
      reposts: eng.reposts,
      replies: eng.comments,
      shares: eng.shares,
      views: eng.views,
      media,
      fanSegment,
      week,
    });
  }
  return out;
}

/** A single account's recent timeline — powers profile pages. */
export function accountTimeline(
  account: NpcAccount,
  player: Player,
  week: number,
  track: Track | null,
  count = 8
): SocialPost[] {
  const composition = deriveFanbase(player);
  const out: SocialPost[] = [];
  for (let i = 0; i < count; i++) {
    const sentiment = pick(ACCOUNT_LEAN[account.accountType]);
    const tpl = eligible(sentiment, player, track);
    if (!tpl) continue;
    const platform = pick(account.preferredPlatforms);
    const fanSegment = accountToSegment(account.accountType, composition);
    const eng = computeEngagement({
      platform,
      followers: account.followers,
      playerFans: player.stats.fans,
      sentiment,
      controversyLevel: 0.1,
      reputation: player.stats.reputation,
      trendAlignment: 0,
      segment: fanSegment,
    });
    const kind = mediaKindFor(platform);
    const media = kind
      ? buildMedia(kind, sentiment, {
          playerName: player.artistName,
          trackTitle: track?.title ?? 'the new one',
          genre: genreLabel(player.genre),
        })
      : undefined;
    out.push({
      id: `prof-${account.id}-${i}-${Date.now()}`,
      platform,
      account,
      content: fill(tpl.template, player, track),
      sentiment,
      likes: eng.likes,
      reposts: eng.reposts,
      replies: eng.comments,
      shares: eng.shares,
      views: eng.views,
      media,
      fanSegment,
      week: Math.max(1, week - i),
    });
  }
  return out;
}
