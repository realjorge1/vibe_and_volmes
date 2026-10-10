import type { PostMeme, PostPoll, Take } from './drama';
import type { RealCategory } from './realworld';

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
  | 'news'
  /** Professional haters: here to ratio. */
  | 'hater'
  /** Another artist's own account (a rival). */
  | 'artist';

export interface NpcAccount {
  id: string;
  username: string;
  handle: string;
  accountType: AccountType;
  followers: number;
  isVerified: boolean;
  preferredPlatforms: Platform[];
  /** Strangers from the crowd: picks a face that matches the name. */
  gender?: 'woman' | 'man';
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

/**
 * What a photo shows, read on the phone (systems/social/sense): the thing
 * comments react to. A dog gets dog comments, a meme gets meme comments,
 * and only a picture of a person gets "you look good".
 */
export type PhotoKind =
  | 'selfie' // one person, close
  | 'fit' // an outfit, a mirror shot, full body
  | 'duo' // two people
  | 'group' // three or more
  | 'baby'
  | 'pet'
  | 'food' // food and drinks
  | 'ride' // cars, bikes
  | 'travel' // planes, boats, passports, landmarks
  | 'home' // houses, rooms, pools
  | 'drip' // jewelry, watches, bags, sneakers, shades
  | 'money'
  | 'scenery' // sky, sunsets, beaches, mountains, flowers
  | 'city' // skylines, streets, architecture
  | 'party' // parties, clubs, fireworks, holidays
  | 'music' // concerts, instruments, studios
  | 'active' // gym, sports, running
  | 'art' // paintings, crafts, tattoos, toys
  | 'meme'
  | 'screenshot' // screenshots, receipts, documents
  | 'milestone' // graduations, weddings
  | 'tech' // setups, phones, screens
  | 'other';

export interface PhotoRead {
  kind: PhotoKind;
  /** The specific thing ("dog", "sushi", "sunset", "watch"), which fills {thing}. */
  thing?: string;
  /** Faces the phone counted (undefined when it couldn't look). */
  faces?: number;
  /** Something else that is clearly in the shot (a selfie with a dog: pet, also selfie). */
  also?: PhotoKind[];
  /** 0..1: how sure the read is. */
  confidence: number;
  /** How it was read: the phone's vision, the file's details, the caption, the game's own photo tags. */
  via: 'vision' | 'meta' | 'caption' | 'stock' | 'none';
}

/** Image-style or short-video description carried by a post (alt/caption). */
export interface PostMedia {
  kind: PostMediaKind;
  description: string;
  /** Photos the artist picked themselves, in order (a carousel when several). */
  photoKeys?: string[];
  /**
   * The player's own real photos from their phone. A post carrying one is
   * protected: nothing negative is ever said about it (systems/social/protect).
   */
  real?: boolean;
  /** What the photos should show (photo-pack tags), for posts made by the generators. */
  tags?: string[];
  /** A people scene from the people pack (couple-selfie, gym-selfie...). */
  scene?: string;
  /** What each picked photo shows (same order as photoKeys), read when it was posted. */
  reads?: PhotoRead[];
}

/** Which part of the internet a post comes from. Missing = posts about the artist. */
export type PostLane = 'everyday' | 'celeb';

/** The artist a celebrity-lane post is about. */
export interface PostSubject {
  id: string;
  name: string;
  handle: string;
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
  /** Drama layer: the angle this post takes, and what it is about. */
  take?: Take;
  topic?: string;
  momentId?: string;
  /** A "who won?" poll (Chirp). */
  poll?: PostPoll;
  /** A meme the post renders instead of a photo. */
  meme?: PostMeme;
  /** Everyday life or another artist's world (not about the player). */
  lane?: PostLane;
  /** Celebrity lane: who it is about (their name fills the comments). */
  subject?: PostSubject;
  /** Everyday lane: what it is about (food, pets, sports...), which picks its comments. */
  vibe?: string;
  /** Where the post says it was taken (anything the artist typed is fine). */
  location?: string;
  /** A paid post ("Sponsored" on VibeGram, "Ad" on Chirp). */
  sponsored?: boolean;
  /** Everyday lane: the world-calendar moment it is about (finals week, a finale...). */
  beat?: string;
  /** About something happening in the real world right now (systems/realworld). */
  world?: PostWorld;
}

/** A post about a real-world story: what it is and where it came from. */
export interface PostWorld {
  topicId: string;
  category: RealCategory;
  /** What people call it ("the Dodgers"), null when the headline has no short name. */
  name: string | null;
  /** The story it's about. */
  headline: string;
  /** The publication and the article (VibeNews opens it). */
  source?: string;
  url?: string;
  /** When the story broke (ms): posts about it show real times. */
  at: number;
  /** From the offline calendar: no link. */
  evergreen?: boolean;
}

/**
 * Something the artist wrote in a comment section (under their own post or
 * anyone's). Kept, so it is still there next time, and people answer it
 * (systems/social/talk/conversation).
 */
export interface MyComment {
  /** `mc-<ms>` */
  id: string;
  postId: string;
  platform: Platform;
  /** The comment it answers (a reply); missing for a comment on the post itself. */
  parentId?: string;
  /** Who it answers. */
  toHandle?: string;
  toName?: string;
  toAccountId?: string;
  /** What the person being answered was (a fan, a hater...). */
  toSide?: string;
  text: string;
  at: number;
  /** The post, in case it is gone from the feed when the comment is opened again. */
  post?: SocialPost;
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
  | 'ambient'
  /** The world outside music (the everyday lane). */
  | 'sports'
  | 'entertainment'
  | 'tech'
  | 'weather'
  | 'lifestyle';

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
  /** About the world, not the player: never boosts the player's posts or streams. */
  world?: boolean;
  /** A real-world trend (systems/realworld): its topic, and the line above it ("Sports · Trending"). */
  realId?: string;
  label?: string;
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
