import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMetaStore } from '../../store/metaStore';
import { getPerk } from '../../data/meta/perks';
import { getBloodline } from '../../data/meta/bloodlines';
import type { StartingPerk } from '../../types/meta';
import type { PlayerStats } from '../../types/player';

/**
 * Consume the pending cross-save selections and apply them to the freshly
 * created player. Called once at the end of onboarding, AFTER createPlayer
 * and archetype tags so perks layer on top (an inheritance, not a replacement).
 * Modest by design — see data/meta/perks for the philosophy.
 */
export function applyPendingInheritance(): StartingPerk[] {
  const { perkIds, bloodlineId } = useMetaStore.getState().consumePending();

  const perks: StartingPerk[] = [];
  for (const id of perkIds) {
    const p = getPerk(id);
    if (p) perks.push(p);
  }
  if (bloodlineId) {
    const bl = getBloodline(bloodlineId);
    const blPerk = bl && getPerk(bl.perkId);
    if (bl && blPerk && !perks.some((p) => p.id === blPerk.id)) {
      perks.push(blPerk);
    }
  }
  if (perks.length === 0) return [];

  const player = usePlayerStore.getState();
  const game = useGameStore.getState();

  for (const perk of perks) {
    const changes: Array<{ stat: keyof PlayerStats; delta: number }> =
      Object.entries(perk.statBonuses).map(([stat, delta]) => ({
        stat: stat as keyof PlayerStats,
        delta: delta as number,
      }));
    if (perk.startingFansBonus) {
      changes.push({ stat: 'fans', delta: perk.startingFansBonus });
    }
    if (changes.length) player.updateStats(changes);
    if (perk.startingMoneyBonus) player.addMoney(perk.startingMoneyBonus);
    for (const tag of perk.startingTags) game.addTag(tag);
  }
  return perks;
}
