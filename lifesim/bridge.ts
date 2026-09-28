/**
 * The ONLY file where LifeSim touches the music game. Keeps the coupling in
 * one seam:
 *   IN:  artist identity (name), shared wallet (player.money), music career
 *        stage as the artist's "occupation".
 *   OUT: getCribMoodBonus() — home-life mood for the music sim to consume
 *        (e.g. as a small performance/energy modifier in the week engine).
 */

import { usePlayerStore } from '../store/playerStore';
import { getCareerStage } from '../systems/career/careerStage';
import type { World } from './core/types';

export function getArtistIdentity(): { name: string; householdName: string } | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  const last = (player.realName || player.artistName).split(' ').slice(-1)[0];
  return { name: player.artistName, householdName: `${last} Household` };
}

/** Shared wallet: LifeSim household funds mirror the music game's money. */
export function readPlayerMoney(): number | null {
  const player = usePlayerStore.getState().player;
  return player ? player.money : null;
}

export function applyPlayerMoneyDelta(delta: number): void {
  if (delta === 0) return;
  const store = usePlayerStore.getState();
  if (!store.player) return;
  store.addMoney(delta);
  store.save();
}

/** The artist's occupation line for the job panel: their music career. */
export function getMusicOccupation(): { title: string; blurb: string } | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  try {
    const stage = getCareerStage();
    return {
      title: `${stage.label} Artist`,
      blurb: 'Employed by the grind. Salary: whatever the charts decide.',
    };
  } catch {
    return { title: 'Artist', blurb: 'Employed by the grind.' };
  }
}

/**
 * OUT-bridge: -10..+10 bonus from the artist's home life, derived from the
 * playable sim's mood. The music game can mix this into weekly performance
 * or energy regen ("well-rested artists write better hooks").
 */
export function getCribMoodBonus(world: World | null): number {
  if (!world || !world.playerHouseholdId) return 0;
  const artistId = world.households[world.playerHouseholdId]?.simIds[0];
  const artist = artistId ? world.sims[artistId] : null;
  if (!artist || artist.dead) return 0;
  return Math.round((artist.mood / 100) * 10);
}
