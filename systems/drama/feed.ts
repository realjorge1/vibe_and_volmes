import type { Platform, SocialPost } from '../../types/social';
import type { Player } from '../../types/player';
import { composePost, pickTopic, reach, topicsFor, type DiscourseInput } from './discourse';
import { toSocialPost } from './feedPosts';

/**
 * The drama layer's share of a feed: posts about whatever the artist's life
 * is actually doing this week (the release, the scandal, the beef, the date),
 * from the people who would really post them.
 */

/** How much of the feed is about specific drama: half for an unknown, most of it for a star. */
export function dramaShare(fans: number): number {
  return 0.5 + 0.3 * reach(fans);
}

export interface DramaFeedOpts {
  player: Player;
  week: number;
  count: number;
  controversy: number;
  idPrefix: string;
  /** Lock to one app (that app's infinite scroll). */
  platform?: Platform;
}

export function dramaPosts(input: DiscourseInput, o: DramaFeedOpts, rnd: () => number = Math.random): SocialPost[] {
  if (o.count <= 0) return [];
  const topics = topicsFor(input);
  const out: SocialPost[] = [];
  let guard = 0;
  while (out.length < o.count && guard++ < o.count * 8) {
    const topic = pickTopic(topics, rnd);
    const visual = o.platform ? o.platform === 'flashpic' || (o.platform === 'chirper' && rnd() < 0.25) : rnd() < 0.35;
    const c = composePost(topic, input, rnd, { visual });
    if (!c) continue;
    const p = toSocialPost(
      c,
      input,
      { player: o.player, week: o.week, rival: input.rival, controversy: o.controversy, idPrefix: o.idPrefix, platform: o.platform },
      out.length,
      rnd
    );
    if (p) out.push(p);
  }
  return out;
}
