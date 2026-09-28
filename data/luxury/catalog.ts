import type { LuxuryItem, StatusTier } from '../../types/status';
import { COLORS } from '../../constants/theme';

/**
 * The flex catalog. Data-driven — append a row and it shows up in the
 * store, gated by career level, priced for the income curve. Costs ramp
 * hard so luxury is a long-tail money sink that signals status, not a
 * quick stat buy.
 */
export const LUXURY_CATALOG: LuxuryItem[] = [
  // ── Fashion ──────────────────────────────────────────────────────────
  { id: 'designer-fit', name: 'Designer Runway Fit', category: 'fashion', cost: 12_000, statusValue: 14, levelReq: 4, tone: 'flashy', flexLine: 'new fit different. they not ready 🧵' },
  { id: 'couture-wardrobe', name: 'Full Couture Wardrobe', category: 'fashion', cost: 140_000, statusValue: 55, levelReq: 12, tone: 'iconic', flexLine: 'archive only from here on out.' },
  { id: 'stylist-team', name: 'Personal Styling Team', category: 'fashion', cost: 60_000, statusValue: 30, levelReq: 9, tone: 'tasteful', flexLine: 'shoutout the team. presentation is everything.' },

  // ── Jewelry ──────────────────────────────────────────────────────────
  { id: 'iced-chain', name: 'Iced-Out Chain', category: 'jewelry', cost: 45_000, statusValue: 28, levelReq: 6, tone: 'flashy', flexLine: 'chain heavier than the doubters 💎' },
  { id: 'grill-set', name: 'Custom Diamond Grill', category: 'jewelry', cost: 30_000, statusValue: 20, levelReq: 6, tone: 'flashy', flexLine: 'smile worth more than the advance.' },
  { id: 'one-of-one-piece', name: 'One-of-One Jeweler Piece', category: 'jewelry', cost: 500_000, statusValue: 90, levelReq: 18, tone: 'iconic', flexLine: 'there is exactly one of these on earth.' },

  // ── Watches ──────────────────────────────────────────────────────────
  { id: 'lux-watch', name: 'Luxury Swiss Watch', category: 'watch', cost: 85_000, statusValue: 34, levelReq: 8, tone: 'tasteful', flexLine: 'time is the only flex that matters ⌚' },
  { id: 'grail-watch', name: 'Grail Collector Watch', category: 'watch', cost: 650_000, statusValue: 95, levelReq: 20, tone: 'iconic', flexLine: 'waitlist was 6 years. I waited 0.' },

  // ── Cars ─────────────────────────────────────────────────────────────
  { id: 'first-whip', name: 'First Real Whip', category: 'car', cost: 70_000, statusValue: 26, levelReq: 5, tone: 'flashy', flexLine: 'remember the bus. never forget the bus. 🏎️' },
  { id: 'supercar', name: 'Italian Supercar', category: 'car', cost: 380_000, statusValue: 70, levelReq: 14, tone: 'flashy', flexLine: 'doors go up. opinions go down.' },
  { id: 'hypercar', name: 'Limited Hypercar', category: 'car', cost: 2_400_000, statusValue: 150, levelReq: 22, tone: 'iconic', flexLine: 'only 30 made. one is mine.' },

  // ── Property ─────────────────────────────────────────────────────────
  { id: 'penthouse', name: 'City Penthouse', category: 'property', cost: 1_200_000, statusValue: 110, levelReq: 16, tone: 'tasteful', flexLine: 'view costs more than the first deal did.' },
  { id: 'hills-mansion', name: 'Hills Mansion', category: 'property', cost: 6_500_000, statusValue: 220, levelReq: 22, tone: 'iconic', flexLine: 'gate code longer than my first mixtape.' },
  { id: 'private-estate', name: 'Private Compound', category: 'property', cost: 22_000_000, statusValue: 400, levelReq: 26, tone: 'iconic', flexLine: 'they need a flight plan to visit.' },

  // ── Jets / travel ────────────────────────────────────────────────────
  { id: 'jet-card', name: 'Private Jet Membership', category: 'jet', cost: 700_000, statusValue: 80, levelReq: 17, tone: 'flashy', flexLine: 'commercial? I don’t know her. ✈️' },
  { id: 'own-jet', name: 'Own The Jet', category: 'jet', cost: 14_000_000, statusValue: 300, levelReq: 25, tone: 'iconic', flexLine: 'tail number is my initials.' },

  // ── Parties / lifestyle ──────────────────────────────────────────────
  { id: 'yacht-week', name: 'Yacht Week', category: 'party', cost: 250_000, statusValue: 45, levelReq: 13, tone: 'flashy', flexLine: 'international waters, international numbers 🛥️' },
  { id: 'birthday-bash', name: 'Legendary Birthday Bash', category: 'party', cost: 900_000, statusValue: 85, levelReq: 18, tone: 'flashy', flexLine: 'the guest list WAS the headline.' },

  // ── Cosmetic / image ─────────────────────────────────────────────────
  { id: 'ink-sleeve', name: 'Custom Tattoo Sleeve', category: 'cosmetic', cost: 18_000, statusValue: 12, levelReq: 3, tone: 'tasteful', flexLine: 'every line is a chapter.' },
  { id: 'image-overhaul', name: 'Full Image Overhaul', category: 'cosmetic', cost: 120_000, statusValue: 40, levelReq: 11, tone: 'flashy', flexLine: 'new era, new face card. never declines.' },

  // ── Security ─────────────────────────────────────────────────────────
  { id: 'security-detail', name: 'Personal Security Detail', category: 'security', cost: 200_000, statusValue: 38, levelReq: 12, tone: 'tasteful', flexLine: 'the love got dangerous. had to staff up.' },

  // ── Art ──────────────────────────────────────────────────────────────
  { id: 'blue-chip-art', name: 'Blue-Chip Art Collection', category: 'art', cost: 3_000_000, statusValue: 170, levelReq: 23, tone: 'iconic', flexLine: 'the walls appreciate faster than the catalog.' },
];

export const STATUS_TIERS: StatusTier[] = [
  { min: 0,    label: 'Broke & Hungry', color: COLORS.textMuted },
  { min: 60,   label: 'Getting Money',  color: COLORS.textSecondary },
  { min: 180,  label: 'Living Lavish',  color: COLORS.primary },
  { min: 420,  label: 'Certified Rich', color: COLORS.primary },
  { min: 800,  label: 'Mogul Status',   color: COLORS.gold },
  { min: 1500, label: 'Untouchable Wealth', color: COLORS.gold },
];

export function statusTier(score: number): StatusTier {
  let t = STATUS_TIERS[0];
  for (const tier of STATUS_TIERS) if (score >= tier.min) t = tier;
  return t;
}

export function getLuxuryItem(id: string): LuxuryItem | undefined {
  return LUXURY_CATALOG.find((i) => i.id === id);
}
