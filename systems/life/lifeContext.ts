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
import { pick } from '../../utils/random';

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

/** A random active artist or producer from the living world, if one exists. */
export function randomWorldNpc(
  roles: Npc['role'][] = ['artist', 'producer']
): Npc | null {
  const world = useWorldStore.getState().world;
  if (!world) return null;
  const pool = world.npcIds
    .map((id) => world.npcs[id])
    .filter((n) => n && n.active && roles.includes(n.role));
  return pool.length > 0 ? pick(pool) : null;
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
    doneThisWeek: tally.done,
    earnedThisWeek: tally.earned,
    lastDone: activities.lastDone,
  };
}
