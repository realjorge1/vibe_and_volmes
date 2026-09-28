import { Router } from 'express';
import { env } from '../env';
import * as store from '../store/community';
import type { PublishedStoryCard } from '../types/contracts';

/**
 * Community sync — the online implementation of the client's `cloudSync`
 * adapter (app systems/sync/cloudSync.ts). Discovery and a global hall of fame
 * for shared careers. The client never blocks on these: on any failure it
 * falls back to bundled local data, so gameplay stays fully offline-capable.
 */
export const communityRouter = Router();

function parseLimit(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), 200);
}

communityRouter.post('/publish', (req, res) => {
  if (!env.community.enabled) return res.status(503).json({ error: 'community_disabled' });
  const card = req.body as Partial<PublishedStoryCard>;
  if (typeof card?.artistName !== 'string' || !card.artistName.trim()) {
    return res.status(400).json({ error: 'artistName is required' });
  }
  const result = store.publishCareer(card as PublishedStoryCard);
  return res.json(result);
});

communityRouter.get('/legends', (req, res) => {
  if (!env.community.enabled) return res.json([]);
  return res.json(store.fetchLegends(parseLimit(req.query.limit, 20)));
});

communityRouter.get('/hall-of-fame', (req, res) => {
  if (!env.community.enabled) return res.json([]);
  return res.json(store.fetchHallOfFame(parseLimit(req.query.limit, 20)));
});
