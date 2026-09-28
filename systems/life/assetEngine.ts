import type { HomeDef, HomeId, LuxuryItem, OwnedLuxury } from '../../types/status';
import { LUXURY_CATALOG } from '../../data/luxury/catalog';
import { HOMES } from '../../data/life/homes';
import { lifestyleBurn } from '../simulation/lifestyle';

/**
 * Assets engine. Pure: what owning things costs each week, where the artist
 * can live, and what moving costs. The weekly charge itself happens in
 * systems/life/assetTick.ts.
 */

export function ownedItems(owned: OwnedLuxury[]): LuxuryItem[] {
  return owned
    .map((o) => LUXURY_CATALOG.find((i) => i.id === o.itemId))
    .filter((i): i is LuxuryItem => i !== undefined);
}

export function weeklyUpkeep(owned: OwnedLuxury[]): number {
  return ownedItems(owned).reduce((s, i) => s + i.upkeep, 0);
}

export type HomeAvailability =
  | { ok: true; cost: number }
  | { ok: false; reason: string };

/**
 * Moving costs a deposit of two weeks at the new place's burn; moving down
 * is free. The top rungs need the property itself.
 */
export function homeAvailability(
  home: HomeDef,
  current: HomeId,
  ownedIds: Set<string>,
  money: number,
  weeklyBurn: number
): HomeAvailability {
  if (home.id === current) return { ok: false, reason: 'You live here' };
  if (home.requiresItem && !home.requiresItem.some((id) => ownedIds.has(id))) {
    const names = home.requiresItem
      .map((id) => LUXURY_CATALOG.find((i) => i.id === id)?.name ?? id)
      .join(' or ');
    return { ok: false, reason: `Buy the ${names} first` };
  }
  const from = HOMES.find((h) => h.id === current);
  const cost =
    from && home.lifestyleTier <= from.lifestyleTier
      ? 0
      : 2 * lifestyleBurn(weeklyBurn, home.lifestyleTier);
  if (cost > money) return { ok: false, reason: `Needs $${cost.toLocaleString('en-US')}` };
  return { ok: true, cost };
}

/**
 * The home the artist can no longer live in, if the deed is gone (sold,
 * repossessed): they drop to their own place.
 */
export function homeAfterLosing(homeId: HomeId, ownedIds: Set<string>): HomeId {
  const home = HOMES.find((h) => h.id === homeId);
  if (!home?.requiresItem) return homeId;
  return home.requiresItem.some((id) => ownedIds.has(id)) ? homeId : 'own-place';
}

/** Short signed summary of a home's weekly effect, for the UI. */
export function homeEffectLabel(home: HomeDef): string {
  const parts: string[] = [];
  const { mentalHealth, energy } = home.weekly;
  if (mentalHealth) parts.push(`Mental ${mentalHealth > 0 ? '+' : '−'}${Math.abs(mentalHealth)}`);
  if (energy) parts.push(`Energy ${energy > 0 ? '+' : '−'}${Math.abs(energy)}`);
  if (home.weekly.isolation) parts.push('Lonely');
  return parts.length > 0 ? `${parts.join(' · ')} / week` : 'No effect';
}
