import 'dotenv/config';

/**
 * Centralized, validated environment access. Read once at boot so the rest of
 * the codebase never touches `process.env` directly and missing config fails
 * loudly in one place.
 */

function str(name: string, fallback = ''): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return v === 'true' || v === '1';
}

export const env = {
  port: int('PORT', 8787),
  allowedOrigins: str('ALLOWED_ORIGINS', '*'),

  ai: {
    apiKey: str('AI_API_KEY'),
    baseUrl: str('LLM_BASE_URL', 'https://api.openai.com/v1/chat/completions'),
    model: str('AI_MODEL', 'gpt-4o-mini'),
    maxOutputTokens: int('MAX_OUTPUT_TOKENS', 380),
    timeoutMs: int('LLM_TIMEOUT_MS', 9000),
    maxTokensPerDay: int('MAX_TOKENS_PER_DAY', 2_000_000),
  },

  community: {
    enabled: bool('COMMUNITY_ENABLED', true),
  },
} as const;

/** True when the AI proxy can actually reach an upstream model. */
export const aiConfigured = (): boolean => env.ai.apiKey.length > 0;
