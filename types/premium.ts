/**
 * Premium monetization types — a COSMETIC-ONLY entitlement layer.
 *
 * Hard rule: nothing here may grant a mechanical advantage (stats, fans, money,
 * extra plan slots, higher beat quality). Items are visual/identity/convenience
 * only. Premium currency is earnable in-game; the real-store billing seam is
 * stubbed and disabled (see systems/premium/billing.ts), mirroring the
 * disabled-cloud sync discipline. Entitlements are ACCOUNT-LEVEL: they persist
 * across careers (own SQLite table, never wiped by retirement).
 */

export type CosmeticCategory =
  | 'studio-theme'
  | 'beat-pack'
  | 'vanity'
  | 'season-pass'
  | 'convenience';

/** Convenience features that toggle on with ownership — never affect outcomes. */
export type ConvenienceFlag = 'auto-fill' | 'cloud-backup' | 'recap-flair';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  /** Premium-currency price. */
  price: number;
  blurb: string;
  /** Ionicons glyph for the catalog tile. */
  icon: string;
  /** studio-theme: the accent color it repaints the studio with. */
  themeColor?: string;
  /** beat-pack: beat ids it unlocks in the picker (variety, NOT power). */
  beatPackIds?: string[];
  /** convenience: the feature flag it enables. */
  convenience?: ConvenienceFlag;
}

export interface SeasonReward {
  kind: 'currency' | 'cosmetic' | 'vanity' | 'none';
  /** currency amount. */
  amount?: number;
  /** cosmetic/vanity id granted. */
  cosmeticId?: string;
  label: string;
}

export interface SeasonRewardTier {
  tier: number; // 1..N
  xpRequired: number;
  free: SeasonReward;
  premium: SeasonReward;
}

export interface SeasonDef {
  id: string;
  name: string;
  blurb: string;
  tiers: SeasonRewardTier[];
}

export interface SeasonProgress {
  seasonId: string;
  xp: number;
  /** Whether the premium reward track is unlocked this season. */
  premiumUnlocked: boolean;
  /** Claimed reward keys, e.g. "free-3" / "prem-5". */
  claimed: string[];
}

/** The account-level entitlement profile (own table; survives retirement). */
export interface PremiumAccount {
  /** Soft premium currency balance ("Vibes"). Earnable; billing stubbed. */
  currency: number;
  /** Owned cosmetic ids. */
  owned: string[];
  /** Equipped studio theme cosmetic id, or null = default look. */
  activeTheme: string | null;
  /** Equipped vanity cosmetic id, or null. */
  activeVanity: string | null;
  /** Active convenience flags. */
  convenience: ConvenienceFlag[];
  season: SeasonProgress;
  /** One-time starter grant marker. */
  starterGranted: boolean;
}

export interface PurchaseResult {
  ok: boolean;
  reason?: 'owned' | 'funds' | 'missing';
  item?: CosmeticItem;
  balanceAfter?: number;
}
