import type {
  SyncAdapter,
  CommunityLegend,
  GlobalChartEntry,
  SeasonalRank,
  CommunityEventDef,
} from '../../types/sync';
import type { StoryCard } from '../../types/legacy';
import { BACKEND_URL } from '../../constants/aiConfig';
import { localSync } from './localSync';

/**
 * Online community adapter. Talks to the Vibe & Volumes backend
 * (`/community/*`) for shared legends and a global hall of fame. It is selected
 * by `getSyncAdapter()` only when a backend URL is configured.
 *
 * Offline-first contract preserved: EVERY method is wrapped so any failure
 * (offline, timeout, backend down, community disabled server-side) silently
 * delegates to `localSync` (bundled seed legends + the player's own retired
 * careers). The game never blocks on or depends on a sync result.
 */

const TIMEOUT_MS = 8000;

async function getJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export const cloudSync: SyncAdapter = {
  id: 'cloud',
  // Selected only when a backend is configured. The backend authoritatively
  // controls whether community is enabled; if it isn't, calls below fall back.
  online: BACKEND_URL.length > 0,

  async publishCareer(card: StoryCard) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${BACKEND_URL}/community/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistName: card.artistName,
            tagline: card.tagline,
            signatureMoment: card.signatureMoment,
            legacyTier: card.legacyTier,
            legacyTotal: card.legacyTotal,
          }),
          signal: ctrl.signal,
        });
        return { ok: res.ok };
      } finally {
        clearTimeout(t);
      }
    } catch {
      return { ok: false };
    }
  },

  async fetchLegends(limit: number) {
    try {
      const remote = await getJson<CommunityLegend[]>(`/community/legends?limit=${limit}`);
      if (remote.length) return remote.slice(0, limit);
    } catch {
      /* fall through to local */
    }
    return localSync.fetchLegends(limit);
  },

  async fetchHallOfFame(limit: number) {
    try {
      const remote = await getJson<CommunityLegend[]>(
        `/community/hall-of-fame?limit=${limit}`
      );
      if (remote.length) return remote.slice(0, limit);
    } catch {
      /* fall through to local */
    }
    return localSync.fetchHallOfFame(limit);
  },

  async fetchGlobalCharts(limit: number) {
    try {
      const remote = await getJson<GlobalChartEntry[]>(
        `/community/charts?limit=${limit}`
      );
      if (remote.length) return remote.slice(0, limit);
    } catch {
      /* fall through to local */
    }
    return localSync.fetchGlobalCharts(limit);
  },

  async fetchSeasonalRanking() {
    try {
      return await getJson<SeasonalRank>('/community/season');
    } catch {
      return localSync.fetchSeasonalRanking();
    }
  },

  async fetchCommunityEvents() {
    try {
      const remote = await getJson<CommunityEventDef[]>('/community/events');
      if (remote.length) return remote;
    } catch {
      /* fall through to local */
    }
    return localSync.fetchCommunityEvents();
  },
};
