import express from 'express';
import cors from 'cors';
import { env, aiConfigured } from './env';
import { aiRouter } from './routes/ai';
import { communityRouter } from './routes/community';

/**
 * Vibe & Volumes backend entrypoint. Two responsibilities only:
 *   /ai/*        — key-holding LLM proxy (the key never ships in the app)
 *   /community/* — shared legends / hall of fame (optional online seam)
 * Everything else (the whole deterministic sim) stays on the device.
 */

const app = express();

const origins = env.allowedOrigins.trim();
app.use(
  cors({
    origin: origins === '*' ? true : origins.split(',').map((o) => o.trim()),
  })
);
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: aiConfigured(),
    communityEnabled: env.community.enabled,
    uptimeSec: Math.round(process.uptime()),
  });
});

app.use('/ai', aiRouter);
app.use('/community', communityRouter);

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err.message);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(env.port, () => {
  console.log(`vibe_and_volumes backend listening on :${env.port}`);
  console.log(`  AI proxy:  ${aiConfigured() ? 'configured' : 'NO KEY (clients stay local)'}`);
  console.log(`  Community: ${env.community.enabled ? 'enabled' : 'disabled'}`);
});
