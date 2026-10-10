import type { FestivalSlot } from '../../types/calendar';

/**
 * Festival season. Pure: whose name goes where on the poster, and what the
 * artist's slot pays. The poster is the status meter everybody understands:
 * the bigger your font, the bigger you are.
 */

export const FESTIVALS: readonly string[] = [
  'Solstice Fields',
  'Neon Desert',
  'Harbor Lights',
  'Wildflower Weekend',
  'Afterdark',
];

export function festivalName(careerYear: number): string {
  return FESTIVALS[(Math.max(1, careerYear) - 1) % FESTIVALS.length];
}

/** Names per tier: headliners, sub-headliners, mid, undercard. */
const TIER_SIZES = [2, 4, 8, 12] as const;
const SLOTS: FestivalSlot[] = ['headliner', 'sub-headliner', 'mid', 'undercard'];

export interface PosterArtist {
  name: string;
  followers: number;
}

/** Smallest following that still gets an undercard slot. */
export const UNDERCARD_MIN_FANS = 2_500;

export interface Lineup {
  tiers: string[][];
  slot: FestivalSlot | null;
  fee: number;
}

/** What a slot pays, for an artist this size. */
export function slotFee(slot: FestivalSlot, fans: number): number {
  const raw =
    slot === 'headliner'
      ? 250_000 + fans * 0.05
      : slot === 'sub-headliner'
        ? 60_000 + fans * 0.04
        : slot === 'mid'
          ? 15_000 + fans * 0.03
          : 2_500 + fans * 0.02;
  return Math.round(Math.min(3_000_000, raw) / 500) * 500;
}

/** Crowd size in front of the artist, by slot. */
export function slotCrowd(slot: FestivalSlot): number {
  return slot === 'headliner' ? 80_000 : slot === 'sub-headliner' ? 35_000 : slot === 'mid' ? 12_000 : 3_000;
}

/**
 * Build the poster from the world's biggest names, then find the artist's
 * line: they go in the tier whose smallest name they out-draw.
 */
export function buildLineup(world: PosterArtist[], player: PosterArtist, rng: () => number = Math.random): Lineup {
  const sorted = [...world].sort((a, b) => b.followers - a.followers);
  const tiers: PosterArtist[][] = [];
  let start = 0;
  for (const size of TIER_SIZES) {
    const band = sorted.slice(start, start + size);
    start += size;
    // Billing inside a tier is a little political, not strictly by numbers.
    tiers.push(
      band
        .map((a) => ({ a, k: a.followers * (0.85 + rng() * 0.3) }))
        .sort((x, y) => y.k - x.k)
        .map((x) => x.a)
    );
  }

  let slot: FestivalSlot | null = null;
  if (player.followers >= UNDERCARD_MIN_FANS) {
    for (let i = 0; i < tiers.length; i++) {
      const floor = tiers[i].length > 0 ? tiers[i][tiers[i].length - 1].followers : 0;
      if (player.followers >= floor * 0.9) {
        slot = SLOTS[i];
        break;
      }
    }
    if (!slot) slot = 'undercard';
  }

  const names = tiers.map((t) => t.map((a) => a.name));
  if (slot) {
    const i = SLOTS.indexOf(slot);
    names[i] = [player.name, ...names[i]].slice(0, TIER_SIZES[i]);
  }
  return { tiers: names, slot, fee: slot ? slotFee(slot, player.followers) : 0 };
}

export function slotLabel(slot: FestivalSlot): string {
  return slot === 'headliner'
    ? 'Headliner'
    : slot === 'sub-headliner'
      ? 'Sub-headliner'
      : slot === 'mid'
        ? 'Main stage, afternoon'
        : 'Undercard';
}
