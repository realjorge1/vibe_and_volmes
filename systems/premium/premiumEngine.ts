import type { PurchaseResult } from '../../types/premium';
import { getCosmetic } from '../../data/premium/catalog';
import { usePremiumStore } from '../../store/premiumStore';
import { pushNotification } from '../live/notify';
import { COLORS } from '../../constants/theme';

/**
 * Premium cosmetic purchase + equip flow. Spends the soft "Vibes" currency,
 * grants the entitlement, and auto-applies it by category. Strictly cosmetic:
 * it touches ONLY the premiumStore (entitlements), never player stats / money /
 * fans. There is structurally nowhere for power to leak in (see types/premium).
 */
export function purchaseCosmetic(id: string): PurchaseResult {
  const item = getCosmetic(id);
  if (!item) return { ok: false, reason: 'missing' };

  const store = usePremiumStore.getState();
  if (store.ownsItem(id)) return { ok: false, reason: 'owned', item };
  if (store.currency < item.price) return { ok: false, reason: 'funds', item };

  store.spendCurrency(item.price);
  store.addOwned(id);

  // Auto-apply by category.
  switch (item.category) {
    case 'studio-theme':
      store.setActiveTheme(id);
      break;
    case 'vanity':
      store.setActiveVanity(id);
      break;
    case 'convenience':
      if (item.convenience) store.addConvenience(item.convenience);
      break;
    case 'season-pass':
      store.setPremiumUnlocked(true);
      break;
    default:
      break;
  }

  pushNotification({
    kind: 'info',
    title: item.name,
    body: 'Unlocked. Enjoy the drip.',
    color: COLORS.primary,
  });

  return { ok: true, item, balanceAfter: usePremiumStore.getState().currency };
}

export function equipTheme(id: string | null): void {
  usePremiumStore.getState().setActiveTheme(id);
}

export function equipVanity(id: string | null): void {
  usePremiumStore.getState().setActiveVanity(id);
}

/**
 * The EARNABLE currency path — granted from gameplay (the passive layer + season
 * pass), so nothing in the catalog is strictly paywalled. Silent by default; a
 * notify is opt-in via `announce`.
 */
export function grantPremiumCurrency(amount: number, announce = false): void {
  if (amount <= 0) return;
  usePremiumStore.getState().grantCurrency(amount);
  if (announce) {
    pushNotification({
      kind: 'info',
      title: `+${Math.round(amount)} Vibes`,
      body: 'Premium currency earned just by playing.',
      color: COLORS.gold,
    });
  }
}
