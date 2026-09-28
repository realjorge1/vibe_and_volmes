import type { ActivityId } from '../../types/passive';
import { getSyncAdapter } from '../sync';
import { useCommunityStore } from '../../store/communityStore';

/**
 * Community layer public surface. Wraps the offline-first sync adapter and
 * caches the snapshot in communityStore so screens + the away sim can read it
 * synchronously. Never blocks gameplay: a failed/slow fetch just leaves the
 * last cached snapshot in place.
 */

export async function refreshCommunity(limit = 20): Promise<void> {
  try {
    const sync = getSyncAdapter();
    const [charts, rank, events] = await Promise.all([
      sync.fetchGlobalCharts(limit),
      sync.fetchSeasonalRanking(),
      sync.fetchCommunityEvents(),
    ]);
    useCommunityStore.getState().setSnapshot({ charts, rank, events });
  } catch {
    /* keep the cached snapshot; community is never load-bearing */
  }
}

/** Activities that earn bonus visibility from currently-active community events. */
export function communityBoostActivities(): Set<ActivityId> {
  return new Set(
    useCommunityStore.getState().events.map((e) => e.boostActivity as ActivityId)
  );
}

export { playerSeasonalRank, formatStreams } from './standing';
