import type { Player } from '../../types/player';
import type {
  NpcAccount,
  PostSentiment,
  SocialPost,
  StoryBeat,
  TrendingTopic,
} from '../../types/social';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useSocialStore } from '../../store/socialStore';
import { computeEngagement } from './platformAlgorithms';
import { pick } from '../../utils/random';
import { notifyPost } from '../notifications/triggers';

/**
 * Story posts: one specific moment from the player's life (an activity
 * result, a family blow-up, an ending) written into the feed, as opposed to
 * the weekly template chatter from feedGenerator. This is how "big moments
 * reach the internet" for anything that happens between week transitions.
 */

/** Sentiments that read as heat — they travel further on every platform. */
const HOT: PostSentiment[] = ['shade', 'hostile', 'news', 'meme'];

function authorFor(beat: StoryBeat): NpcAccount {
  const matches = NPC_ACCOUNTS.filter((a) => a.accountType === beat.from);
  return pick(matches.length > 0 ? matches : NPC_ACCOUNTS);
}

export function buildStoryPost(
  beat: StoryBeat,
  player: Player,
  week: number,
  storyId: string
): SocialPost {
  const account = authorFor(beat);
  const platform = account.preferredPlatforms[0];
  const eng = computeEngagement({
    platform,
    followers: account.followers,
    playerFans: player.stats.fans,
    sentiment: beat.sentiment,
    controversyLevel: HOT.includes(beat.sentiment) ? 0.6 : 0.2,
    reputation: player.stats.reputation,
    trendAlignment: beat.trend ? 0.8 : 0.3,
  });
  return {
    id: `story-${storyId}-${week}-${Date.now()}`,
    platform,
    account,
    content: beat.text,
    sentiment: beat.sentiment,
    likes: eng.likes,
    reposts: eng.reposts,
    replies: eng.comments,
    shares: eng.shares,
    views: eng.views,
    week,
    relatedEventId: storyId,
  };
}

export function buildStoryTrend(
  beat: StoryBeat,
  player: Player,
  week: number,
  storyId: string
): TrendingTopic | null {
  if (!beat.trend) return null;
  return {
    hashtag: `#${beat.trend}`,
    volume: Math.round(Math.max(2_500, player.stats.fans * 0.5)),
    sentiment: beat.sentiment,
    kind: HOT.includes(beat.sentiment) ? 'scandal' : 'meme',
    momentum: 'rising',
    relatedEventId: storyId,
    peakWeek: week,
  };
}

/**
 * Put a story beat at the top of the live feed (and its hashtag on the
 * trending board). The weekly transition regenerates the feed, but the post
 * stays in history, where threads and the Chronicle can find it.
 */
export function publishStoryBeat(beat: StoryBeat, storyId: string): SocialPost | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const week = useGameStore.getState().week;
  const social = useSocialStore.getState();

  const post = buildStoryPost(beat, player, week, storyId);
  social.setFeed([post, ...social.feed]);
  social.addToHistory([post]);

  const trend = buildStoryTrend(beat, player, week, storyId);
  if (trend) {
    const rest = social.trending.filter((t) => t.hashtag !== trend.hashtag);
    social.setTrending([trend, ...rest]);
  }
  // The post pings the artist's phone a moment later.
  notifyPost(post);
  return post;
}
