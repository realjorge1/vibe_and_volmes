import type { SocialPost } from '../../types/social';
import type { CareerCapsule, GenSpec } from '../../types/ai';
import { AI_CONFIG } from '../../constants/aiConfig';
import { buildContextCapsule, capsuleSignature } from '../memory/capsule';
import { requestGeneration } from '../gateway';
import { useSocialStore } from '../../store/socialStore';
import { useGameStore } from '../../store/gameStore';
import { reusable } from '../../systems/social/protect';

/**
 * HYBRID social media. `feedGenerator` already produced the full template
 * feed instantly (the offline truth). This layer asynchronously upgrades
 * ONLY the few highest-impact posts so they reference the player's actual
 * scandals/rivals/arc — then patches them into the store. 90%+ of the feed
 * stays free template; AI spend is gated by an impact score so quiet weeks
 * cost $0.
 */

const DRAMATIC: SocialPost['sentiment'][] = [
  'hostile',
  'shade',
  'news',
  'hype',
  'meme',
];

/** Only spend a generation when the week is actually dramatic. */
function impactScore(c: CareerCapsule): number {
  let s = 0;
  if (c.activeControversy) s += 25 + c.activeControversy.heat * 0.4;
  if (c.topRival) {
    s += c.topRival.intensity * 0.4;
    if (c.topRival.legendary) s += 15;
  }
  s += (c.memorableBeats[0]?.severity ?? 0) * 0.2;
  if (Math.abs(c.momentum) > 50) s += 12;
  if (['Cancelled', 'Controversial', 'Icon'].includes(c.reputationTier)) s += 15;
  return Math.round(s);
}

/** Most frequent value in a list (ties → first seen). */
function mode<T>(items: T[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestN = 0;
  for (const it of items) {
    const n = (counts.get(it) ?? 0) + 1;
    counts.set(it, n);
    if (n > bestN) {
      bestN = n;
      best = it;
    }
  }
  return best;
}

/** Pick the posts most worth upgrading: dramatic sentiment + event-linked. */
function selectTargets(posts: SocialPost[]): SocialPost[] {
  // Never rewrite a post with the player's real photo, or one that isn't about the player.
  return posts
    .filter((p) => reusable(p) && !p.lane)
    .map((p) => ({
      p,
      w:
        (DRAMATIC.includes(p.sentiment) ? 3 : 0) +
        (p.relatedEventId ? 2 : 0) +
        p.likes / 50_000,
    }))
    .sort((a, b) => b.w - a.w)
    .slice(0, AI_CONFIG.maxEnhancedPostsPerWeek)
    .map((x) => x.p);
}

export interface EnhanceOutcome {
  posts: SocialPost[];
  enhanced: number;
  provider: 'local' | 'cloud' | 'none';
}

/**
 * Pure transform: returns a new posts array with the top targets rewritten.
 * Single batched gateway call (one call → N lines), so cost is O(1)/week.
 */
export async function enhanceFeed(
  posts: SocialPost[],
  week: number
): Promise<EnhanceOutcome> {
  const capsule = buildContextCapsule();
  if (!capsule) return { posts, enhanced: 0, provider: 'none' };

  if (impactScore(capsule) < AI_CONFIG.impactThreshold) {
    return { posts, enhanced: 0, provider: 'none' };
  }

  const targets = selectTargets(posts);
  if (targets.length === 0) return { posts, enhanced: 0, provider: 'none' };

  // Batch around the single most dramatic sentiment among targets.
  const sentiment =
    targets.find((t) => DRAMATIC.includes(t.sentiment))?.sentiment ??
    targets[0].sentiment;

  // Dominant platform + fan segment among targets so the prompt voices the
  // rewrite in the right medium for the right slice of the fandom.
  const platform = mode(targets.map((t) => t.platform)) ?? targets[0].platform;
  const segment = mode(
    targets.map((t) => t.fanSegment).filter(Boolean) as string[]
  );

  const spec: GenSpec = {
    feature: 'social-enhance',
    capsule,
    params: {
      sentiment,
      count: targets.length,
      platform,
      ...(segment ? { segment } : {}),
    },
    // Stable seed → same dramatic signature reuses cache ($0 next time).
    seed: `${capsuleSignature(capsule)}|${sentiment}|${platform}|${segment ?? '-'}`,
  };

  const result = await requestGeneration(spec, week);
  const lines = result.text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { posts, enhanced: 0, provider: 'none' };

  const replaced = new Map<string, string>();
  targets.forEach((t, i) => {
    if (lines[i]) replaced.set(t.id, lines[i]);
  });

  const next = posts.map((p) =>
    replaced.has(p.id)
      ? { ...p, content: replaced.get(p.id)!, aiEnhanced: true }
      : p
  );

  return { posts: next, enhanced: replaced.size, provider: result.provider };
}

/**
 * Fire-and-forget entry used by the weekly tick. NEVER awaited by the sim —
 * the template feed is already live; this swaps in upgraded posts when ready
 * (optimistic UI). Safe to call every week; it self-gates on impact.
 */
export function enhanceCurrentFeedAsync(week: number): void {
  const social = useSocialStore.getState();
  const snapshot = social.feed;
  if (snapshot.length === 0) return;

  social.setAiEnhancing(true);
  enhanceFeed(snapshot, week)
    .then((out) => {
      // Only patch if the player hasn't moved to a newer week's feed.
      const cur = useSocialStore.getState();
      if (
        out.enhanced > 0 &&
        useGameStore.getState().week === week &&
        cur.feed === snapshot
      ) {
        cur.setFeed(out.posts);
      }
    })
    .catch(() => {})
    .finally(() => useSocialStore.getState().setAiEnhancing(false));
}
