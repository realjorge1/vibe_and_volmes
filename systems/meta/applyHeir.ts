import type { HeirInheritance } from '../../types/meta';
import type { Person } from '../../types/people';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { usePeopleStore } from '../../store/peopleStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { useMetaStore } from '../../store/metaStore';
import { getBloodline } from '../../data/meta/bloodlines';
import { newPersonId } from '../life/peopleEngine';
import { getFameLevelNumber } from '../../utils/statHelpers';

/** Tag every heir carries: events about living up to (or down) the name. */
export const FAMOUS_PARENT_TAG = 'famous-parent';

function introLine(heir: HeirInheritance): string {
  const { parent } = heir;
  const alive = heir.family.find((m) => m.traits.includes('famous-parent') && m.role === 'parent');
  const bloodline = heir.bloodlineId ? getBloodline(heir.bloodlineId) : undefined;
  const lead = alive
    ? `${alive.title.replace(/^your/, 'Your')}, ${parent.artistName}, is ${parent.identityTitle}. Everyone expects you to be next.`
    : `${parent.artistName}, ${parent.identityTitle}, is gone. You inherited the name, the money and the expectations.`;
  return bloodline ? `${lead} ${bloodline.lore}` : lead;
}

/**
 * Start a child's career from what the last one left: called at the end of
 * onboarding, right after the player is created. Money, a following, the
 * family (who remember the last artist), the family's rivals, and the
 * bloodline picked from how the parent is remembered.
 */
export function applyHeir(heir: HeirInheritance): void {
  const players = usePlayerStore.getState();
  const player = players.player;
  if (!player) return;
  usePlayerStore.setState({ player: { ...player, generation: heir.generation } });
  if (heir.money) players.addMoney(heir.money);
  if (heir.fans) players.updateStats([{ stat: 'fans', delta: heir.fans }]);

  const game = useGameStore.getState();
  game.addTag(FAMOUS_PARENT_TAG);

  // The bloodline perk rides the normal inheritance path (applyPendingInheritance).
  if (heir.bloodlineId) useMetaStore.getState().setPendingBloodline(heir.bloodlineId);

  const relationships = useRelationshipStore.getState();
  for (const id of heir.rivalIds) {
    relationships.introduceArtist(id);
    const artist = useRelationshipStore.getState().getArtist(id);
    if (!artist) continue;
    relationships.setRelationshipType(id, 'rival');
    useRivalryStore.getState().ensureRival(id, artist.fans, getFameLevelNumber(artist.fans));
  }

  const week = game.week;
  const family: Person[] = heir.family.map((m) => ({
    id: newPersonId(),
    name: m.name,
    role: m.role,
    title: m.title,
    affinity: m.affinity,
    traits: [...m.traits],
    sinceWeek: 0,
    lastSeenWeek: week,
  }));
  usePeopleStore.getState().setPeople(family);
  game.addWeekSummaryNotes([introLine(heir)], 'personal');
}
