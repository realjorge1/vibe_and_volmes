import { create } from 'zustand';
import type { PremiumAccount, ConvenienceFlag } from '../types/premium';
import { CURRENT_SEASON, getCosmetic } from '../data/premium/catalog';
import { PASSIVE_CONFIG } from '../constants/passiveConfig';
import { savePremium, loadPremium } from '../database/gameRepository';

/**
 * Premium entitlements — ACCOUNT-LEVEL, like metaStore. Persists to its own
 * `premium_account` table (savePremium/loadPremium), so it is NOT wiped by
 * clearAllData / retirement and has NO reset() by design. Self-saves on every
 * mutation. Strictly cosmetic: it never touches player stats, fans, or money.
 */

const DEFAULT: PremiumAccount = {
  currency: 0,
  owned: [],
  activeTheme: null,
  activeVanity: null,
  convenience: [],
  season: {
    seasonId: CURRENT_SEASON.id,
    xp: 0,
    premiumUnlocked: false,
    claimed: [],
  },
  starterGranted: false,
};

interface PremiumActions {
  /** One-time welcome grant + season rollover reconciliation. */
  ensureStarter: () => void;
  grantCurrency: (amount: number) => void;
  spendCurrency: (amount: number) => boolean;
  addOwned: (id: string) => void;
  ownsItem: (id: string) => boolean;
  setActiveTheme: (id: string | null) => void;
  setActiveVanity: (id: string | null) => void;
  addConvenience: (flag: ConvenienceFlag) => void;
  hasConvenience: (flag: ConvenienceFlag) => boolean;
  /** Beat-pack ids the player owns (used to unlock cosmetic beats in the picker). */
  ownedBeatPackIds: () => string[];
  addSeasonXp: (amount: number) => void;
  setPremiumUnlocked: (v: boolean) => void;
  markClaimed: (key: string) => void;
  load: () => void;
  save: () => void;
}

type PremiumStore = PremiumAccount & PremiumActions;

export const usePremiumStore = create<PremiumStore>((set, get) => ({
  ...DEFAULT,

  ensureStarter() {
    const s = get();
    let next: Partial<PremiumAccount> = {};
    if (!s.starterGranted) {
      next.currency = s.currency + PASSIVE_CONFIG.PREMIUM_STARTER_GRANT;
      next.starterGranted = true;
    }
    // Season rollover: a new global season resets progress (cosmetics kept).
    if (s.season.seasonId !== CURRENT_SEASON.id) {
      next.season = {
        seasonId: CURRENT_SEASON.id,
        xp: 0,
        premiumUnlocked: false,
        claimed: [],
      };
    }
    if (Object.keys(next).length > 0) {
      set(next);
      get().save();
    }
  },

  grantCurrency(amount) {
    if (amount <= 0) return;
    set({ currency: get().currency + Math.round(amount) });
    get().save();
  },

  spendCurrency(amount) {
    if (get().currency < amount) return false;
    set({ currency: get().currency - amount });
    get().save();
    return true;
  },

  addOwned(id) {
    if (get().owned.includes(id)) return;
    set({ owned: [...get().owned, id] });
    get().save();
  },

  ownsItem(id) {
    return get().owned.includes(id);
  },

  setActiveTheme(id) {
    set({ activeTheme: id });
    get().save();
  },

  setActiveVanity(id) {
    set({ activeVanity: id });
    get().save();
  },

  addConvenience(flag) {
    if (get().convenience.includes(flag)) return;
    set({ convenience: [...get().convenience, flag] });
    get().save();
  },

  hasConvenience(flag) {
    return get().convenience.includes(flag);
  },

  ownedBeatPackIds() {
    return get().owned.filter((id) => getCosmetic(id)?.category === 'beat-pack');
  },

  addSeasonXp(amount) {
    if (amount <= 0) return;
    const season = get().season;
    set({ season: { ...season, xp: season.xp + Math.round(amount) } });
    get().save();
  },

  setPremiumUnlocked(v) {
    set({ season: { ...get().season, premiumUnlocked: v } });
    get().save();
  },

  markClaimed(key) {
    const season = get().season;
    if (season.claimed.includes(key)) return;
    set({ season: { ...season, claimed: [...season.claimed, key] } });
    get().save();
  },

  load() {
    const saved = loadPremium<PremiumAccount>();
    if (saved) set({ ...DEFAULT, ...saved });
  },

  save() {
    const {
      currency,
      owned,
      activeTheme,
      activeVanity,
      convenience,
      season,
      starterGranted,
    } = get();
    savePremium({
      currency,
      owned,
      activeTheme,
      activeVanity,
      convenience,
      season,
      starterGranted,
    });
  },
}));
