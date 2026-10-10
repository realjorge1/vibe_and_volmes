import type { ThreadCtx } from './threadGenerator';
import { useDramaStore } from '../../store/dramaStore';
import { RIVAL_ARTISTS } from '../../data/artists/rivalArtists';
import { hottestRival, partnerName } from '../drama/publish';
import { friendlyArtists, rivalIds } from './relations';
import { celebInput } from './celebContext';
import { realTopicsNow } from '../realworld/refresh';

/**
 * What every comment section knows, built the same way everywhere (the open
 * thread and the notification that quotes it), so a quoted comment is always
 * really there.
 */

export { friendlyArtists, rivalIds };

export function threadContext(): ThreadCtx {
  const rivals = rivalIds();
  return {
    moments: useDramaStore.getState().moments,
    rivalName: hottestRival()?.name ?? null,
    partnerName: partnerName(),
    friends: friendlyArtists(),
    // Every named artist the player has beef with, known or not yet met.
    rivalNames: RIVAL_ARTISTS.filter((a) => rivals.has(a.id)).map((a) => a.name),
    // Other artists' comment sections know who's who (and who's with whom).
    cast: celebInput()?.cast ?? [],
    real: realTopicsNow(),
  };
}
