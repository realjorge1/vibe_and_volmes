import type { AIProvider, AIRequest, AIResult } from '../../types/ai';
import { BACKEND_URL, AI_CONFIG } from '../../constants/aiConfig';

/**
 * Cloud adapter. Implemented behind the SAME `AIProvider` interface as the
 * local provider so it is fully swappable. It POSTs to the Vibe & Volumes
 * BACKEND (`/ai/generate`) — which holds the LLM key and does the actual model
 * call — instead of talking to a model host directly. This is why the API key
 * never ships in the app bundle.
 *
 * Disabled by default: the router never selects this unless a backend URL is
 * configured, AI is enabled, and the budget allows it. The local deterministic
 * provider remains the source of truth; any failure here degrades to local.
 */

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

export class CloudProvider implements AIProvider {
  id = 'cloud' as const;
  private healthyAt = 0;
  private healthy = false;

  async isHealthy(): Promise<boolean> {
    if (!BACKEND_URL) return false;
    const now = Date.now();
    if (now - this.healthyAt < AI_CONFIG.network.healthTtlMs) {
      return this.healthy;
    }
    // Presence of a backend URL is enough to attempt a call; the first real
    // request surfaces hard failures and the gateway degrades to local on throw.
    this.healthy = true;
    this.healthyAt = now;
    return true;
  }

  async generate(req: AIRequest): Promise<AIResult> {
    const { signal, clear } = withTimeout(AI_CONFIG.network.timeoutMs);
    try {
      const res = await fetch(`${BACKEND_URL}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: req.feature,
          system: req.system,
          promptText: req.promptText,
          maxOutputTokens: req.maxOutputTokens,
          temperature: req.temperature,
        }),
        signal,
      });
      if (!res.ok) throw new Error(`backend ${res.status}`);
      const json = (await res.json()) as {
        text?: string;
        tokensIn?: number;
        tokensOut?: number;
        moderated?: boolean;
      };
      return {
        text: json.text?.trim() ?? '',
        provider: 'cloud',
        tokensIn: json.tokensIn ?? 0,
        tokensOut: json.tokensOut ?? 0,
        cached: false,
        degraded: false,
        moderated: json.moderated ?? false,
      };
    } finally {
      clear();
    }
  }
}

export const cloudProvider = new CloudProvider();
