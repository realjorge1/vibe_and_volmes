export type LuxuryCategory =
  | 'fashion'
  | 'jewelry'
  | 'watch'
  | 'car'
  | 'property'
  | 'jet'
  | 'party'
  | 'cosmetic'
  | 'security'
  | 'art';

/**
 * How loud the purchase is. Drives the fan-perception split:
 * the same chain reads as "finally made it" to stans and "money
 * changed them" to everyone else, weighted by the player's authenticity.
 */
export type FlexTone = 'tasteful' | 'flashy' | 'iconic';

export interface LuxuryItem {
  id: string;
  name: string;
  category: LuxuryCategory;
  cost: number;
  /** Raw status points contributed while owned. */
  statusValue: number;
  /** Career level required to buy. */
  levelReq: number;
  tone: FlexTone;
  /** First-person brag posted to the feed on purchase. */
  flexLine: string;
  /** Weekly cost of owning it: insurance, staff, storage, fuel. */
  upkeep: number;
}

export interface OwnedLuxury {
  itemId: string;
  boughtAtWeek: number;
  boughtAtCost: number;
}

// ─── Home ────────────────────────────────────────────────────────────────

export type HomeId =
  | 'childhood-bedroom'
  | 'shared-apartment'
  | 'own-place'
  | 'penthouse'
  | 'mansion';

export interface HomeDef {
  id: HomeId;
  label: string;
  /** How the story refers to it, lowercase: "your penthouse". */
  title: string;
  blurb: string;
  /**
   * The economy's lifestyle tier while living here, which sets the weekly
   * lifestyle burn (rent, bills, living). Moving home is how that tier moves.
   */
  lifestyleTier: number;
  /** Applied every week the artist lives here. */
  weekly: { mentalHealth: number; energy: number; isolation?: number };
  /** Owning any of these luxury items is the deed. */
  requiresItem?: string[];
  /** Written into the Deck on moving in. */
  moveInLine: string;
}

export interface StatusTier {
  min: number;
  label: string;
  color: string;
}

export interface PurchaseResult {
  ok: boolean;
  reason?: 'funds' | 'level' | 'owned' | 'missing';
  item?: LuxuryItem;
  /** Net status after the buy. */
  statusAfter?: number;
  /** Public verdict the internet rendered. */
  verdict?: 'made-it' | 'humble' | 'changed' | 'plant' | 'iconic';
}
