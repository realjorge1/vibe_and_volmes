export type Platform = 'chirper' | 'flashpic' | 'tunetok' | 'vibestream';

export type PostSentiment =
  | 'hype'
  | 'positive'
  | 'neutral'
  | 'critical'
  | 'hostile'
  | 'meme'
  | 'news'
  | 'shade';

export type AccountType =
  | 'fan'
  | 'stan'
  | 'critic'
  | 'gossip'
  | 'rival-fan'
  | 'industry'
  | 'public'
  | 'news';

export interface NpcAccount {
  id: string;
  username: string;
  handle: string;
  accountType: AccountType;
  followers: number;
  isVerified: boolean;
  preferredPlatforms: Platform[];
}

/**
 * The player's audience is not a monolith. The same event lands differently
 * on each of these segments — stans defend through a scandal, casuals quietly
 * leave, the toxic core amplifies the pile-on. Modeled in `systems/social/fanbase`.
 */
export type FanSegment =
  | 'hardcore'      // the devoted core — show up for everything, forgive a lot
  | 'casual'        // the passive majority — here for hits, gone at the first drama
  | 'stan'          // online-warrior superfans — parasocial, combative, loud
  | 'toxic'         // antagonistic followers — thrive on outrage and pile-ons
  | 'local'         // hometown/regional base — proud, loyal, locality-driven
  | 'international'; // global fans — trend- and algorithm-driven discovery

export interface FanbaseComposition {
  /** Fraction of the fanbase in each segment (sums to ~1). */
  shares: Record<FanSegment, number>;
  /** Absolute headcount per segment. */
  counts: Record<FanSegment, number>;
  total: number;
}

export type PostMediaKind = 'image' | 'video';

/** Image-style or short-video description carried by a post (alt/caption). */
export interface PostMedia {
  kind: PostMediaKind;
  description: string;
}

/** The full engagement model the platform algorithms produce. */
export interface EngagementMetrics {
  likes: number;
  comments: number;
  reposts: number;
  shares: number;
  views: number;
}

export interface SocialPost {
  id: string;
  platform: Platform;
  account: NpcAccount;
  content: string;
  sentiment: PostSentiment;
  likes: number;
  reposts: number;
  /** Comment count. Kept named `replies` for backward compatibility. */
  replies: number;
  /** Phase 2 ecosystem: full engagement model (algorithm-derived). */
  shares?: number;
  views?: number;
  /** Image / short-video description when the post carries media. */
  media?: PostMedia;
  /** Which of the player's fan segments authored/voices this post, if any. */
  fanSegment?: FanSegment;
  week: number;
  relatedEventId?: string;
  /** Phase 4: post text was upgraded by the AI immersion layer. */
  aiEnhanced?: boolean;
}

/** What kind of cultural moment a trend represents. */
export type TrendKind =
  | 'song'
  | 'scandal'
  | 'meme'
  | 'fashion'
  | 'movement'
  | 'beef'
  | 'artist'
  | 'ambient';

export interface TrendingTopic {
  hashtag: string;
  volume: number;
  sentiment: PostSentiment;
  /** Cultural category — drives discovery weighting & chart influence. */
  kind?: TrendKind;
  /** Week-over-week direction for the UI flame/▲▼. */
  momentum?: 'rising' | 'steady' | 'cooling';
  relatedEventId?: string;
  peakWeek: number;
}

export interface SocialFeed {
  posts: SocialPost[];
  trending: TrendingTopic[];
  activePlatform: Platform;
  week: number;
}

/**
 * A specific story moment posted to the feed (an activity result, a family
 * drama, an ending), as opposed to the weekly template chatter. `text` may use
 * `{playerName}` and `{npc}`.
 */
export interface StoryBeat {
  sentiment: PostSentiment;
  /** Which kind of account posts it. */
  from: AccountType;
  text: string;
  /** Optional hashtag (without #) pushed onto the trending board. */
  trend?: string;
}
