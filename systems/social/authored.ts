import type { NpcAccount, Platform, SocialPost } from '../../types/social';

/**
 * WHAT THE ARTIST POSTS THEMSELVES.
 *
 * A post the player writes in one of the phone apps. It is cosmetic (no stat
 * moves), but it behaves like a real one: likes, views and replies build up
 * over the next real minutes, and the fans' reactions ping the phone.
 * Ids are `my-<platform>-<ms>`, so a post always knows when it went up.
 */

const RISE_MS = 18 * 60 * 1000;

export function authoredId(platform: Platform, at: number): string {
  return `my-${platform}-${at}`;
}

export function authoredAt(post: SocialPost): number | null {
  const m = post.id.match(/^my-[a-z]+-(\d+)$/);
  return m ? Number(m[1]) : null;
}

export function isAuthored(post: SocialPost): boolean {
  return authoredAt(post) !== null;
}

/** The artist's posts from the last few hours: they lead their own feed for a while. */
export function freshAuthored(posts: readonly SocialPost[], hours = 6, now = Date.now()): SocialPost[] {
  return posts.filter((p) => {
    const at = authoredAt(p);
    return at !== null && now - at < hours * 3_600_000;
  });
}

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createAuthored(
  platform: Platform,
  account: NpcAccount,
  content: string,
  week: number,
  media?: SocialPost['media'],
  at = Date.now()
): SocialPost {
  return {
    id: authoredId(platform, at),
    platform,
    account,
    content: content.trim(),
    sentiment: 'hype',
    likes: 0,
    reposts: 0,
    replies: 0,
    shares: 0,
    views: 0,
    media,
    week,
  };
}

/**
 * The post as it stands `now`: engagement climbs fast in the first minutes
 * and settles, scaled by how many people follow the artist on that app.
 * `commentsUp` (from the comment section, systems/social/talk) keeps the
 * count honest: never fewer comments than people have actually written.
 */
export function withEngagement(post: SocialPost, followers: number, now = Date.now(), commentsUp?: (sinceMs: number) => number): SocialPost {
  const at = authoredAt(post);
  if (at === null) return post;
  const t = Math.max(0, now - at);
  const grown = 1 - Math.exp(-t / RISE_MS);
  const h = hashOf(post.id);
  const pull = 0.03 + (h % 50) / 1000; // 3%..8% of followers like a good post
  const likes = Math.round(followers * pull * grown + (t > 20_000 ? 1 + (h % 4) : 0));
  return {
    ...post,
    likes,
    views: Math.round(likes * (18 + (h % 14))),
    replies: Math.max(Math.round(likes * 0.05), commentsUp ? commentsUp(t) : 0),
    reposts: Math.round(likes * (post.platform === 'chirper' ? 0.09 : 0.02)),
    shares: Math.round(likes * 0.03),
  };
}
