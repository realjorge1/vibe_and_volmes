import type { AccountType, PostSentiment, SocialPost } from '../../types/social';

/**
 * Which new posts are worth a ping. Real apps don't notify you about every
 * mention: they push the ones from big or verified accounts, the news, the
 * heat. One per app at most, best first.
 */

const ACCOUNT_WEIGHT: Record<AccountType, number> = {
  news: 1.8,
  industry: 1.6,
  gossip: 1.6,
  critic: 1.3,
  'rival-fan': 1.2,
  stan: 1,
  fan: 0.75,
  public: 0.6,
  hater: 0.9,
  artist: 2,
};

const HEAT: Record<PostSentiment, number> = {
  news: 1.45,
  hostile: 1.35,
  shade: 1.3,
  hype: 1.15,
  critical: 1.1,
  meme: 1.05,
  positive: 1,
  neutral: 0.8,
};

export function pingScore(p: SocialPost): number {
  const reach = Math.log10(10 + (p.views ?? p.likes * 20));
  return reach * ACCOUNT_WEIGHT[p.account.accountType] * HEAT[p.sentiment] * (p.account.isVerified ? 1.5 : 1);
}

/** The posts in a fresh batch that deserve a notification. */
export function feedHighlights(posts: readonly SocialPost[], max = 3): SocialPost[] {
  const best = new Map<SocialPost['platform'], SocialPost>();
  for (const p of posts) {
    // Only posts about the artist ping: strangers' lunches and other artists' news don't.
    if (p.lane) continue;
    // The news app only pushes actual news.
    if (p.platform === 'vibestream' && p.sentiment !== 'news' && p.account.accountType !== 'news') continue;
    const cur = best.get(p.platform);
    if (!cur || pingScore(p) > pingScore(cur)) best.set(p.platform, p);
  }
  return [...best.values()].sort((a, b) => pingScore(b) - pingScore(a)).slice(0, max);
}
