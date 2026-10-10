import type { Platform, SocialPost } from './social';

/**
 * PHONE NOTIFICATIONS.
 *
 * What lands on the device's real notification shade while you play: the
 * artist's apps pinging them (likes, comments, mentions, stories, news) and
 * the game's own moments (level-ups, badges). Each one remembers exactly
 * where it leads, so tapping it opens that app on that post or story.
 */

/** Which "app" a notification comes from. `game` is Vibe & Volumes itself. */
export type PhoneApp = Platform | 'game';

export type PhoneNotificationKind =
  | 'mention'
  | 'like'
  | 'comment'
  | 'reply'
  | 'follow'
  | 'repost'
  | 'trend'
  | 'story'
  | 'post'
  | 'news'
  | 'sound'
  | 'views'
  | 'dm'
  | 'level'
  | 'achievement'
  | 'energy'
  | 'info';

/** Where a tap lands. */
export type NotificationTarget =
  | { kind: 'post'; postId: string; replyId?: string }
  /** TokTalk: the video with its comments open on the quoted comment. */
  | { kind: 'comments'; postId: string; replyId?: string }
  /** VibeGram: someone's story (the story itself rides along as `post`). */
  | { kind: 'story'; accountId: string }
  | { kind: 'account'; accountId: string }
  | { kind: 'trend'; hashtag: string }
  /** An app tab, e.g. its notifications screen. */
  | { kind: 'tab'; tab: string }
  /** A game screen. */
  | { kind: 'route'; href: string }
  /** A DM conversation. */
  | { kind: 'dm'; threadId: string };

export interface NotificationActor {
  id: string;
  name: string;
  handle: string;
  verified: boolean;
}

export interface PhoneNotification {
  id: string;
  /** The Android notification id (an int, stable for this notification). */
  nid: number;
  app: PhoneApp;
  kind: PhoneNotificationKind;
  title: string;
  body: string;
  actor?: NotificationActor;
  /** Picture for the expanded notification and the inbox row. */
  image?: { photoKey?: string; trackId?: string };
  target: NotificationTarget;
  /** The post behind it, so a tap still opens it after the feed moves on. */
  post?: SocialPost;
  at: number;
  read: boolean;
  /** Accent color for game notifications. */
  color?: string;
}

/** A notification before it is delivered (the store assigns id, nid, time). */
export type NotificationDraft = Omit<PhoneNotification, 'id' | 'nid' | 'at' | 'read'>;
