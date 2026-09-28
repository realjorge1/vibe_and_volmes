import type { InfluenceBundle } from '../../types/industry';
import type { PlayerStats } from '../../types/player';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useCareerStore } from '../../store/careerStore';
import { commitHistory } from '../history/historyEngine';

/**
 * Apply a resolved InfluenceBundle to the Phase 1 player/game stores
 * exactly once. Shared by the weekly Phase 3 tick and by player-initiated
 * flows (interviews, PR responses) so effects are applied consistently.
 */
export function applyBundle(bundle: InfluenceBundle, week: number): void {
  const playerStore = usePlayerStore.getState();
  const gameStore = useGameStore.getState();
  const careerStore = useCareerStore.getState();

  const changes: Array<{ stat: keyof PlayerStats; delta: number }> = [];
  for (const [stat, delta] of Object.entries(bundle.statDeltas)) {
    if (delta) {
      changes.push({
        stat: stat as keyof PlayerStats,
        delta: Math.round(delta),
      });
    }
  }
  if (bundle.fansDelta) {
    changes.push({ stat: 'fans', delta: Math.round(bundle.fansDelta) });
  }
  if (changes.length > 0) playerStore.updateStats(changes);

  if (bundle.moneyDelta) {
    playerStore.addMoney(Math.round(bundle.moneyDelta));
  }

  if (Object.keys(bundle.mentalDeltas).length > 0) {
    careerStore.adjustMental(bundle.mentalDeltas);
  }

  for (const tag of bundle.addTags) gameStore.addTag(tag);
  for (const tag of bundle.removeTags) gameStore.removeTag(tag);

  const p = usePlayerStore.getState().player;
  if (p) {
    careerStore.setEconomy({
      netWorth: p.money - careerStore.economy.debt,
    });
  }

  commitHistory(bundle, week);
}
