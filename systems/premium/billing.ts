/**
 * Real-money billing seam — DISABLED, mirroring systems/sync/cloudSync.
 *
 * The premium currency ("Vibes") is fully earnable in-game; this seam is the
 * single place a real IAP/store SDK would plug in to also SELL currency. It
 * ships hard-disabled: `getBillingAdapter()` returns the local no-op, so the
 * game never charges, never blocks on a store, and is identical with or without
 * a backend. Turning monetization "on" later is "implement the adapter + flip
 * `online`", nothing else — and even then it only ever sells the soft currency,
 * never gameplay power.
 */

export interface CurrencyPack {
  id: string;
  /** Vibes granted. */
  amount: number;
  /** Display price, e.g. "$4.99". Purely informational while disabled. */
  priceLabel: string;
}

/** What a store WOULD offer. Shown as "coming soon" while billing is disabled. */
export const CURRENCY_PACKS: CurrencyPack[] = [
  { id: 'vibes-small', amount: 500, priceLabel: '$4.99' },
  { id: 'vibes-medium', amount: 1200, priceLabel: '$9.99' },
  { id: 'vibes-large', amount: 2800, priceLabel: '$19.99' },
];

export interface BillingAdapter {
  readonly id: 'local' | 'store';
  /** True only when a real store SDK is wired. Hard-disabled in this build. */
  readonly online: boolean;
  /** Purchase a currency pack. Local adapter never charges and degrades. */
  purchaseCurrency(packId: string): Promise<{ ok: boolean; granted: number }>;
}

const localBilling: BillingAdapter = {
  id: 'local',
  online: false,
  async purchaseCurrency() {
    // No store wired — currency is earned in-game. Never charges.
    return { ok: false, granted: 0 };
  },
};

// A real adapter (App Store / Play Billing) would live here and set
// online=true once configured. Disabled today on purpose.
const storeBilling: BillingAdapter = {
  id: 'store',
  online: false,
  async purchaseCurrency() {
    return { ok: false, granted: 0 };
  },
};

export function getBillingAdapter(): BillingAdapter {
  return storeBilling.online ? storeBilling : localBilling;
}

/** Whether the "buy currency" UI should present as live or "coming soon". */
export function isBillingLive(): boolean {
  return getBillingAdapter().online;
}
