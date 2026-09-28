import type { HeirInheritance } from '../../types/meta';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { usePeopleStore } from '../../store/peopleStore';
import { useCareerStore } from '../../store/careerStore';
import { useMetaStore } from '../../store/metaStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { getEnding } from '../../data/life/endings';
import { buildHeir } from '../life/endingEngine';
import { computeLegacy, deriveIdentity } from './chronicleEngine';
import { retireCareer, type RetirementResult } from './retirement';

/** Artist ids the family is at odds with: they will remember the name. */
function familyRivalIds(): string[] {
  const rels = useRelationshipStore.getState().relationships;
  const ids = new Set(useRivalryStore.getState().allRivals().map((r) => r.artistId));
  for (const [id, rel] of Object.entries(rels)) {
    if (rel.type === 'rival' || rel.type === 'enemy') ids.add(id);
  }
  return [...ids];
}

export interface EndCareerResult extends RetirementResult {
  heir: HeirInheritance | null;
}

/**
 * Close the career that just ended (or that the player chose to retire):
 * optionally continue as one of their children, then retire through the
 * dossier. The heir's inheritance is written to the meta profile FIRST —
 * retirement wipes every per-save store, and only the meta profile survives.
 */
export function endCareer(heirChildId?: string): EndCareerResult {
  const game = useGameStore.getState();
  const endingId = game.ending?.id ?? 'retirement';
  const player = usePlayerStore.getState().player;
  const people = usePeopleStore.getState().people;
  const child = heirChildId
    ? people.find((p) => p.id === heirChildId && p.role === 'child')
    : undefined;

  let heir: HeirInheritance | null = null;
  if (child && player) {
    const identity = deriveIdentity();
    heir = buildHeir({
      player,
      week: game.week,
      child,
      people,
      peakFans: Math.max(useCareerStore.getState().arc.peakFans, player.stats.fans),
      rivalIds: familyRivalIds(),
      identity: identity.label,
      identityTitle: identity.title,
      legacyTier: computeLegacy().tier,
      ending: endingId,
      died: getEnding(endingId).kind === 'died',
    });
    useMetaStore.getState().setPendingHeir(heir);
  }

  return { ...retireCareer(endingId), heir };
}
