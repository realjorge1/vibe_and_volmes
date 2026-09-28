import type { HomeId } from '../../types/status';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useStatusStore } from '../../store/statusStore';
import { useCareerStore } from '../../store/careerStore';
import { getHome, startingHome } from '../../data/life/homes';
import { homeAfterLosing, weeklyUpkeep } from './assetEngine';

/**
 * The store-touching side of Assets: where a career starts living, moving,
 * and the weekly bill for everything the artist owns.
 */

/** Tag set while the artist can't cover upkeep; the repo man reads it. */
export const BEHIND_TAG = 'behind-on-upkeep';

function applyHome(id: HomeId): void {
  useStatusStore.getState().setHome(id);
  useCareerStore.getState().setEconomy({ lifestyleTier: getHome(id).lifestyleTier });
}

/**
 * Give the career a home, once. New careers start by age; saves from before
 * homes keep their lifestyle tier and get the home that matches it.
 */
export function ensureHome(isNewCareer: boolean): void {
  const player = usePlayerStore.getState().player;
  if (!player || useStatusStore.getState().homeId) return;
  if (isNewCareer) {
    applyHome(startingHome(player.startAge));
    return;
  }
  const tier = useCareerStore.getState().economy.lifestyleTier;
  useStatusStore.getState().setHome(tier <= 0 ? 'childhood-bedroom' : tier === 1 ? 'shared-apartment' : 'own-place');
}

/** Move house: set the lifestyle tier, pay the deposit, tell the Deck. */
export function moveHome(id: HomeId, deposit: number): void {
  applyHome(id);
  if (deposit > 0) usePlayerStore.getState().addMoney(-deposit);
  useGameStore.getState().addStoryLine(getHome(id).moveInLine, 'personal', `home:${id}`);
}

/**
 * If the deed to the current home is gone, move out. Called after anything
 * that can take an asset away.
 */
export function settleHome(): void {
  const status = useStatusStore.getState();
  if (!status.homeId) return;
  const owned = new Set(status.owned.map((o) => o.itemId));
  const next = homeAfterLosing(status.homeId, owned);
  if (next !== status.homeId) {
    applyHome(next);
    useGameStore.getState().addWeekSummaryNotes(
      [`Without the deed, you moved out of ${getHome(status.homeId).title} and into a rental.`],
      'personal'
    );
  }
}

/**
 * One week of owning things and living somewhere: charge upkeep (falling
 * behind if the money isn't there), then let the home do its thing to mood
 * and energy. Runs in the week transition after the economy tick.
 */
export function runAssetWeek(week: number): void {
  const player = usePlayerStore.getState().player;
  const status = useStatusStore.getState();
  if (!player) return;

  const upkeep = weeklyUpkeep(status.owned);
  const game = useGameStore.getState();
  if (upkeep > 0) {
    const paid = Math.min(upkeep, player.money);
    usePlayerStore.getState().addMoney(-paid);
    useCareerStore.getState().recordLedger({
      week,
      amount: -paid,
      kind: 'upkeep',
      note: 'Upkeep on what you own',
    });
    if (paid < upkeep) {
      if (!game.hasTag(BEHIND_TAG)) {
        game.addWeekSummaryNotes(
          [`You could not cover $${(upkeep - paid).toLocaleString('en-US')} in upkeep this week. The repo man has your address.`],
          'drama'
        );
      }
      game.addTag(BEHIND_TAG);
    } else if (game.hasTag(BEHIND_TAG)) {
      game.removeTag(BEHIND_TAG);
      game.addWeekSummaryNotes(['You caught up on your upkeep. The letters stop.'], 'personal');
    }
  }

  const home = getHome(status.homeId ?? 'shared-apartment');
  const changes = [];
  if (home.weekly.mentalHealth) changes.push({ stat: 'mentalHealth' as const, delta: home.weekly.mentalHealth });
  if (home.weekly.energy) changes.push({ stat: 'energy' as const, delta: home.weekly.energy });
  if (changes.length > 0) usePlayerStore.getState().updateStats(changes);
  if (home.weekly.isolation) {
    useCareerStore.getState().adjustMental({ isolation: home.weekly.isolation });
  }
}
