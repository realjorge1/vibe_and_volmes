import { useRelationshipStore } from '../../store/relationshipStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { handleOf } from '../drama/feedPosts';

/** Who the player is at odds with, and who likes them (store glue shared by the social systems). */

/** Artists the player is at odds with: active rivals, and anyone they've fallen out with. */
export function rivalIds(): Set<string> {
  const ids = new Set(useRivalryStore.getState().allRivals().map((r) => r.artistId));
  for (const [id, rel] of Object.entries(useRelationshipStore.getState().relationships)) {
    if (rel.type === 'rival' || rel.type === 'enemy' || rel.affinity <= -25) ids.add(id);
  }
  return ids;
}

/** Artists who like the player and aren't at odds with them. */
export function friendlyArtists(): { id: string; name: string; handle: string }[] {
  const rel = useRelationshipStore.getState();
  const rivals = rivalIds();
  return rel.knownArtists
    .filter((a) => {
      const r = rel.relationships[a.id];
      if (!r || rivals.has(a.id)) return false;
      return r.affinity >= 25 || r.type === 'ally' || r.type === 'collaborator' || r.type === 'mentor';
    })
    .map((a) => ({ id: a.id, name: a.name, handle: handleOf(a.name) }));
}
