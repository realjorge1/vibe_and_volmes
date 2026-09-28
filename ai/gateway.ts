import type { AIRequest, AIResult, GenSpec } from '../types/ai';
import { AI_CONFIG } from '../constants/aiConfig';
import { pickProvider, localProvider } from './providers/router';
import { capsuleSignature } from './memory/capsule';
import { cacheKey, readCache, writeCache } from './cache/genCache';
import { recordSpend } from './budget/ledger';
import { preConstraints, screenLines } from './moderation/filter';
import { buildFeaturePrompt } from './prompts';

/**
 * THE single entry point for all generation. Nothing in the game calls a
 * provider directly. Order is deliberate and is the entire cost/safety story:
 *
 *   cache → provider select → generate → moderation → budget → cache write
 *
 * Guarantees:
 *  - never throws (any failure degrades to deterministic local output)
 *  - never blocks the weekly tick (callers fire-and-forget, patch on resolve)
 *  - never bills twice for the same dramatic week (signature cache)
 *  - never emits unscreened text (moderation runs on BOTH providers)
 */
export async function requestGeneration(
  spec: GenSpec,
  week: number
): Promise<AIResult> {
  const provider = await pickProvider(week);

  const key = cacheKey([
    provider.id,
    spec.feature,
    capsuleSignature(spec.capsule),
    JSON.stringify(spec.params),
    spec.seed,
  ]);

  const hit = readCache(key);
  if (hit) return hit;

  const req: AIRequest = {
    feature: spec.feature,
    spec,
    system: preConstraints(),
    promptText: buildFeaturePrompt(spec),
    maxOutputTokens: AI_CONFIG.maxOutputTokens,
    temperature: 0.9,
  };

  let result: AIResult;
  try {
    result = await provider.generate(req);
  } catch {
    // Cloud failed (offline/timeout/quota) — deterministic local always works.
    result = await localProvider.generate(req);
    result.degraded = true;
  }

  // Moderation runs regardless of provider. If a cloud line is unsafe we
  // retry once on local; if that still fails the caller keeps its template.
  const screened = screenLines(result.text);
  if (screened.lines.length === 0 && result.provider === 'cloud') {
    const safe = await localProvider.generate(req);
    const s2 = screenLines(safe.text);
    result = { ...safe, degraded: true, moderated: true };
    result.text = s2.lines.join('\n');
  } else {
    result.text = screened.lines.join('\n');
    result.moderated = screened.rejected > 0;
  }

  recordSpend(result, week);
  writeCache(key, result, week);
  return result;
}
