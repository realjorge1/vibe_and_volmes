import type { AIResult } from '../../types/ai';
import { aiCacheGet, aiCacheSet, aiCachePrune } from '../../database/gameRepository';
import { AI_CONFIG } from '../../constants/aiConfig';

/**
 * SQLite-backed generation cache. The biggest single cost lever: a week with
 * the same dramatic signature returns last time's text for $0 instead of
 * re-billing. Local-provider output is deterministic so it caches perfectly;
 * cloud output is cached just as aggressively.
 */

function fnv1a(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function cacheKey(parts: (string | number)[]): string {
  return fnv1a(parts.join('§'));
}

export function readCache(key: string): AIResult | null {
  const raw = aiCacheGet(key);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as AIResult;
    return { ...r, cached: true };
  } catch {
    return null;
  }
}

export function writeCache(key: string, result: AIResult, week: number): void {
  // Never cache empties or moderation-rejected content.
  if (!result.text || result.moderated) return;
  aiCacheSet(key, JSON.stringify({ ...result, cached: false }), week);
}

/** Call once per weekly tick — cheap, keeps the table bounded. */
export function pruneCache(currentWeek: number): void {
  aiCachePrune(currentWeek - AI_CONFIG.cacheTtlWeeks);
}
