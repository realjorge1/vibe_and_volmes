import type { RelationshipChange } from '../../types/events';
import type { Player } from '../../types/player';
import { useRelationshipStore } from '../../store/relationshipStore';
import { RIVAL_ARTISTS } from '../../data/artists/rivalArtists';
import { getFameLevelNumber } from '../../utils/statHelpers';
import { pick, chance } from '../../utils/random';

/**
 * Apply affinity deltas from an event. Auto-introduces any artist the
 * event references but the player hasn't met yet.
 */
export function applyRelationshipChanges(
  changes: RelationshipChange[],
  _week: number
): void {
  const store = useRelationshipStore.getState();
  for (const change of changes) {
    if (!store.isKnown(change.artistId)) {
      store.introduceArtist(change.artistId);
    }
    store.updateAffinity(change.artistId, change.delta);
  }
}

/**
 * As the player climbs, they organically meet peers at their level.
 * Returns the newly introduced artist id, if any.
 */
export function maybeIntroduceRival(player: Player): string | null {
  const store = useRelationshipStore.getState();
  const fameLevel = getFameLevelNumber(player.stats.fans);
  if (fameLevel < 1) return null;
  if (!chance(0.25)) return null;

  const candidates = RIVAL_ARTISTS.filter((a) => {
    if (store.isKnown(a.id)) return false;
    // Only meet artists roughly within reach of the player's stature.
    return a.fans <= Math.max(player.stats.fans * 8, 5000);
  });
  if (candidates.length === 0) return null;

  const artist = pick(candidates);
  store.introduceArtist(artist.id);
  return artist.id;
}
