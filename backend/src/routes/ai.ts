import { Router } from 'express';
import { aiConfigured } from '../env';
import { generate } from '../services/llm';
import { screenLines } from '../services/moderation';
import { canSpend, record } from '../services/budget';
import type { AIGenerateRequest, AIGenerateResponse } from '../types/contracts';

/**
 * AI proxy. The client's cloud provider POSTs here instead of calling the LLM
 * directly, so the API key never ships in the app. Mirrors the old client flow
 * (app ai/gateway.ts): generate → moderate. The client still owns cache, the
 * local-fallback, and its own budget gate; if anything here fails it degrades
 * to free deterministic generation on the device.
 */
export const aiRouter = Router();

aiRouter.post('/generate', async (req, res) => {
  const body = req.body as Partial<AIGenerateRequest>;

  if (typeof body?.system !== 'string' || typeof body?.promptText !== 'string') {
    return res.status(400).json({ error: 'system and promptText are required' });
  }

  // No key configured → tell the client cleanly so it stays on local.
  if (!aiConfigured()) {
    return res.status(503).json({ error: 'ai_not_configured' });
  }

  // Server-side daily guardrail.
  if (!canSpend()) {
    return res.status(429).json({ error: 'budget_exhausted' });
  }

  try {
    const raw = await generate({
      feature: body.feature ?? 'unknown',
      system: body.system,
      promptText: body.promptText,
      model: body.model,
      maxOutputTokens: body.maxOutputTokens,
      temperature: body.temperature,
    });

    record(raw.tokensIn + raw.tokensOut);

    const screened = screenLines(raw.text);
    const payload: AIGenerateResponse = {
      text: screened.lines.join('\n'),
      tokensIn: raw.tokensIn,
      tokensOut: raw.tokensOut,
      moderated: screened.rejected > 0,
    };
    return res.json(payload);
  } catch (err) {
    // Upstream failure (timeout / quota / outage). The client degrades to its
    // deterministic local provider, so a 502 here is non-fatal to gameplay.
    console.error('[ai/generate] upstream error:', (err as Error).message);
    return res.status(502).json({ error: 'upstream_failed' });
  }
});
