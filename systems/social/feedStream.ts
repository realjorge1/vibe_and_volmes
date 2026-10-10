import type { SocialPost, PostSentiment, Platform, NpcAccount } from '../../types/social';
import type { Player } from '../../types/player';
import type { Track } from '../../types/music';
import { TEMPLATES_BY_SENTIMENT } from '../../data/social/postTemplates';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { platformOf } from '../../data/social/platforms';
import { buildMedia } from '../../data/social/mediaTemplates';
import { getReputationTier } from '../../utils/statHelpers';
import { genreLabel } from '../../utils/formatters';
import { pick, weightedPickKey, chance, randInt } from '../../utils/random';
import { deriveFanbase, accountToSegment } from './fanbase';
import { byAttention, computeEngagement, withFameTone } from './platformAlgorithms';
import type { DiscourseInput } from '../drama/discourse';
import { dramaPosts, dramaShare } from '../drama/feed';
import { feedMix, interleave, splitCount, type LaneInput } from './lanes';
import { everydayPosts } from './everyday';
import { celebPosts } from './celebFeed';

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
  hater: ['hostile', 'critical', 'shade'],
  artist: ['shade', 'hype', 'shade'],
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
  /** The drama layer's view of the artist's week. */
  discourse?: DiscourseInput | null;
  /** The rest of the internet (everyday life, other artists), sized by the artist's fame. */
  lanes?: LaneInput | null;
}

/** Generate the next page of posts for a single platform's infinite feed. */
export function streamMorePosts(opts: StreamOpts): SocialPost[] {
  const { player, week, platform, track, page } = opts;
  const split = opts.lanes ? splitCount(opts.count, feedMix(player.stats.fans)) : { everyday: 0, celeb: 0, you: opts.count };
  const dramaCount = opts.discourse ? Math.round(split.you * dramaShare(player.stats.fans)) : 0;
  const count = split.you - dramaCount;
  const weights = withFameTone(repWeights(player.stats.reputation), player.stats.fans);
  const composition = deriveFanbase(player);
  const accounts = byAttention(
    NPC_ACCOUNTS.filter((a) => a.preferredPlatforms.includes(platform)),
    player.stats.fans
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
  if (opts.discourse && dramaCount > 0) {
    const drama = dramaPosts(opts.discourse, {
      player,
      week,
      count: dramaCount,
      controversy: getReputationTier(player.stats.reputation).label === 'Cancelled' ? 0.5 : 0.15,
      idPrefix: `stream-d-${platform}-${page}`,
      platform,
    });
    // Interleave so the scroll doesn't come in blocks.
    for (const p of drama) out.splice(Math.floor(Math.random() * (out.length + 1)), 0, p);
  }
  if (!opts.lanes) return out;
  const others = [
    ...everydayPosts({ week, baseYear: opts.lanes.baseYear, city: opts.lanes.city, count: split.everyday, idPrefix: `stream-ev-${platform}-${page}`, platform, real: opts.lanes.real }),
    ...(opts.lanes.celeb ? celebPosts(opts.lanes.celeb, { count: split.celeb, idPrefix: `stream-cl-${platform}-${page}`, platform }) : []),
  ];
  return interleave(out, others);
}

/** A single account's recent timeline — powers profile pages. */
export function accountTimeline(
  account: NpcAccount,
  player: Player,
  week: number,
  track: Track | null,
  count = 8,
  /** Lock the timeline to one app (a profile opened inside that app). */
  onPlatform?: Platform
): SocialPost[] {
  const composition = deriveFanbase(player);
  const out: SocialPost[] = [];
  for (let i = 0; i < count; i++) {
    const sentiment = pick(ACCOUNT_LEAN[account.accountType]);
    const tpl = eligible(sentiment, player, track);
    if (!tpl) continue;
    const platform = onPlatform ?? pick(account.preferredPlatforms);
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
