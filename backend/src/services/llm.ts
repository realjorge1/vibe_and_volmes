import { env } from '../env';
import type { AIGenerateRequest } from '../types/contracts';

/**
 * The upstream LLM call — moved off the client (was app ai/providers/openai.ts,
 * which shipped the API key in the bundle). The key now lives ONLY in this
 * process's env. OpenAI-style chat-completions shape; point `LLM_BASE_URL` at
 * any compatible host (OpenAI, Anthropic via a shim, self-hosted).
 */

export interface LlmResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

export async function generate(req: AIGenerateRequest): Promise<LlmResult> {
  const { signal, clear } = withTimeout(env.ai.timeoutMs);
  try {
    const res = await fetch(env.ai.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model ?? env.ai.model,
        temperature: req.temperature ?? 0.9,
        max_tokens: req.maxOutputTokens ?? env.ai.maxOutputTokens,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.promptText },
        ],
      }),
      signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`upstream ${res.status}: ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: json.choices?.[0]?.message?.content?.trim() ?? '',
      tokensIn: json.usage?.prompt_tokens ?? 0,
      tokensOut: json.usage?.completion_tokens ?? 0,
    };
  } finally {
    clear();
  }
}
