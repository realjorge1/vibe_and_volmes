import type { SyncAdapter } from '../../types/sync';
import { localSync } from './localSync';
import { cloudSync } from './cloudSync';

/**
 * Optional online seam — public surface.
 *
 * Contract: the game is fully playable offline and NEVER blocks on a sync
 * call. `getSyncAdapter()` returns `localSync` unless a real backend is
 * wired AND `cloudSync.online` is true (it is hard-disabled today), exactly
 * mirroring the Phase 4 AI router's local-default discipline. Callers code
 * against `SyncAdapter` and never branch on online/offline themselves.
 */
export function getSyncAdapter(): SyncAdapter {
  return cloudSync.online ? cloudSync : localSync;
}

export { localSync, cloudSync };
export type { SyncAdapter, CommunityLegend } from '../../types/sync';
