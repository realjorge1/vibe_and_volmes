import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useProgressionStore } from '../../store/progressionStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { useWorldStore } from '../../store/worldStore';
import { useActivityStore } from '../../store/activityStore';
import { stageForProgress } from '../career/careerStage';
import { ageAtWeek } from './age';
import type { ActivityContext } from './activityEngine';
import type { Npc } from '../../types/world';
import type { NewcomerCandidate } from '../events/personalize';
import { usePeopleStore } from '../../store/peopleStore';
import { partnerOf } from './peopleEngine';
import { shuffle } from '../../utils/random';

/**
 * Store reads for the Life systems, kept out of the pure engines. Everything
 * here is a snapshot: nothing is written.
 */

export function currentAge(): number | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  return ageAtWeek(player.startAge, useGameStore.getState().week);
}

/**
 * The rival to aim at: the hottest active rivalry, else a known artist the
 * player is already at odds with. Null when there is nobody to diss.
 */
export function currentRival(): { id: string; name: string } | null {
  const known = useRelationshipStore.getState().knownArtists;
  const rels = useRelationshipStore.getState().relationships;
  const nameOf = (id: string) => known.find((a) => a.id === id)?.name;

  const hottest = useRivalryStore
    .getState()
    .allRivals()
    .sort((a, b) => b.intensity - a.intensity)
    .find((r) => nameOf(r.artistId));
  if (hottest) return { id: hottest.artistId, name: nameOf(hottest.artistId)! };

  const atOdds = known.find((a) => {
    const t = rels[a.id]?.type;
    return t === 'rival' || t === 'enemy';
  });
  return atOdds ? { id: atOdds.id, name: atOdds.name } : null;
}

export interface WorldNpcQuery {
  roles?: Npc['role'][];
  /** Skip NPCs already in the artist's life. */
  unlinked?: boolean;
  /** Skip NPCs currently dating someone in the world. */
  single?: boolean;
  /** Draw from the most-followed quarter of the pool. */
  famous?: boolean;
}

function isDating(npc: Npc): boolean {
  return Object.values(npc.relationships).some((r) => r.status === 'dating');
}

/** Living-world NPCs matching the query, in random order. */
export function worldNpcs({
  roles = ['artist', 'producer'],
  unlinked = false,
  single = false,
  famous = false,
}: WorldNpcQuery = {}): Npc[] {
  const world = useWorldStore.getState().world;
  if (!world) return [];
  const linked = new Set(
    unlinked ? usePeopleStore.getState().people.map((p) => p.npcId).filter(Boolean) : []
  );
  let pool = world.npcIds
    .map((id) => world.npcs[id])
    .filter(
      (n) =>
        n &&
        n.active &&
        roles.includes(n.role) &&
        !linked.has(n.id) &&
        (!single || !isDating(n))
    );
  if (famous && pool.length > 4) {
    pool = [...pool]
      .sort((a, b) => b.social.followers - a.social.followers)
      .slice(0, Math.ceil(pool.length / 4));
  }
  return shuffle(pool);
}

/** A random active artist or producer from the living world, if one exists. */
export function randomWorldNpc(query: WorldNpcQuery = {}): Npc | null {
  return worldNpcs(query)[0] ?? null;
}

/** Strangers events can introduce as `{new}`. */
export function newcomerCandidates(n = 3): NewcomerCandidate[] {
  return worldNpcs({ roles: ['artist', 'producer', 'influencer'], unlinked: true })
    .slice(0, n)
    .map((npc) => ({ name: npc.name, npcId: npc.id }));
}

export function buildActivityContext(): ActivityContext | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const game = useGameStore.getState();
  const level = useProgressionStore.getState().level;
  const activities = useActivityStore.getState();
  const tally = activities.weekTally(game.week);
  return {
    week: game.week,
    age: ageAtWeek(player.startAge, game.week),
    level,
    careerStage: stageForProgress(level, player.stats.fans).id,
    stats: player.stats,
    money: player.money,
    tags: game.playerTags,
    hasRival: currentRival() !== null,
    hasPartner: partnerOf(usePeopleStore.getState().people) !== undefined,
    doneThisWeek: tally.done,
    earnedThisWeek: tally.earned,
    lastDone: activities.lastDone,
  };
}
