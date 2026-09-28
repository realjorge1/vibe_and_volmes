import Constants from 'expo-constants';

/**
 * Phase 4 AI layer configuration. The game is FULLY playable with AI off —
 * the deterministic local provider always satisfies every request, so this
 * config only ever decides whether the (optional) cloud provider is allowed
 * to spend tokens. AI is OFF by default and must be explicitly enabled.
 */

function envFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === '1';
}

const extra =
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined) ?? {};

/**
 * Base URL of the Vibe & Volumes backend (AI proxy + community sync), from app
 * config `extra.backendUrl` or env. The LLM key lives ON THE BACKEND, never in
 * this bundle. Empty = no backend configured, so the AI router pins to the
 * deterministic local provider and the game runs fully offline.
 */
export const BACKEND_URL: string = (
  (extra.backendUrl as string) ?? process.env.EXPO_PUBLIC_BACKEND_URL ?? ''
).replace(/\/+$/, '');

/**
 * Master switch. Even when true, the cloud provider only runs if a backend URL
 * is configured, the provider is healthy, and the budget is not exhausted.
 * Default: OFF (pure deterministic local generation).
 */
export const AI_CLOUD_ENABLED_DEFAULT: boolean =
  envFlag(extra.aiEnabled) || envFlag(process.env.EXPO_PUBLIC_AI_ENABLED);

export const AI_CONFIG = {
  /** Budget caps — the ledger pins to local when any is exceeded. */
  budget: {
    maxTokensPerSession: 120_000,
    maxTokensLifetime: 4_000_000,
    maxCloudCallsPerWeek: 6, // weekly tick is the dominant call site
  },

  /**
   * Selective-invocation gate. The social enhancer only spends a cloud call
   * when the week's `impactScore` clears this threshold; routine weeks stay
   * 100% template ($0). Tuned so only dramatic weeks pay for AI.
   */
  impactThreshold: 45,

  /** How many feed posts a single batched call may upgrade per week. */
  maxEnhancedPostsPerWeek: 3,

  /** Cache entries older than this many in-game weeks are pruned. */
  cacheTtlWeeks: 26,

  /** Rough chars→token estimate for the budget ledger (no tokenizer on RN). */
  charsPerToken: 4,

  /** Hard cap on capsule size sent to any provider (token-budget safety). */
  maxCapsuleTokens: 320,

  /** Per-request output ceiling. */
  maxOutputTokens: 380,

  network: {
    timeoutMs: 9_000,
    healthTtlMs: 60_000,
  },
} as const;

export type AIFeature =
  | 'social-enhance'
  | 'comment-thread'
  | 'interview-write'
  | 'lyric-assist'
  | 'rivalry-voice'
  | 'news-rewrite'
  | 'award-commentary'
  | 'event-enrich'
  | 'documentary'
  | 'chronicle-bio'
  | 'top-moments';
