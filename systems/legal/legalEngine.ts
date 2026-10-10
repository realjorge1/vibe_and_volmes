import type { ChargeDef, LawyerTier } from '../../types/legal';

/**
 * The court. Pure: lawyer costs and odds, the verdict, the sentence, and the
 * escape. The glue (systems/legal/legalTick) applies them.
 */

export interface LawyerDef {
  id: LawyerTier;
  label: string;
  blurb: string;
  /** Multiplier on the chance of a conviction. */
  convict: number;
  /** Multiplier on the sentence. */
  sentence: number;
}

export const LAWYERS: Record<LawyerTier, LawyerDef> = {
  public: {
    id: 'public',
    label: 'Public defender',
    blurb: 'Free. Overworked. Has forty other cases this week.',
    convict: 1.15,
    sentence: 1.1,
  },
  solid: {
    id: 'solid',
    label: 'A good lawyer',
    blurb: 'Knows the judge, answers the phone.',
    convict: 0.8,
    sentence: 0.9,
  },
  elite: {
    id: 'elite',
    label: 'The best money can buy',
    blurb: 'Has gotten worse people off for worse things.',
    convict: 0.45,
    sentence: 0.7,
  },
  plea: {
    id: 'plea',
    label: 'Take the plea',
    blurb: 'Guilty, but half the time. No surprises.',
    convict: 1,
    sentence: 0.5,
  },
};

/** What each lawyer costs for this charge. */
export function lawyerCost(tier: LawyerTier, charge: ChargeDef, fans: number): number {
  switch (tier) {
    case 'solid':
      return Math.round(Math.max(5_000, charge.fine * 0.4) / 500) * 500;
    case 'elite':
      return Math.round(Math.min(750_000, Math.max(25_000, charge.fine * 1.5 + fans * 0.05)) / 1000) * 1000;
    default:
      return 0;
  }
}

/** Chance the court convicts. */
export function convictionChance(
  charge: ChargeDef,
  tier: LawyerTier,
  reputation: number,
  priors: number
): number {
  if (tier === 'plea') return 1;
  const repDrag = reputation < 30 ? 1.12 : reputation > 70 ? 0.92 : 1;
  const p = charge.evidence * LAWYERS[tier].convict * repDrag * (1 + priors * 0.12);
  return Math.max(0.05, Math.min(0.97, p));
}

export interface Verdict {
  convicted: boolean;
  /** 0 = probation. */
  weeks: number;
}

export function rollVerdict(
  charge: ChargeDef,
  tier: LawyerTier,
  reputation: number,
  priors: number,
  rng: () => number = Math.random
): Verdict {
  const convicted = rng() < convictionChance(charge, tier, reputation, priors);
  if (!convicted) return { convicted: false, weeks: 0 };
  const [min, max] = charge.sentence;
  const raw = min + rng() * Math.max(0, max - min);
  const weeks = Math.round(raw * LAWYERS[tier].sentence * (1 + priors * 0.15));
  return { convicted: true, weeks: weeks <= 1 ? 0 : weeks };
}

// ─── The escape ───────────────────────────────────────────────────────────────

export interface EscapeStep {
  id: string;
  prompt: string;
  options: { id: string; label: string; stat: 'discipline' | 'charisma' | 'talent' | 'creativity'; base: number }[];
}

/** Three moves. Each has to work. */
export const ESCAPE_STEPS: EscapeStep[] = [
  {
    id: 'moment',
    prompt: 'Pick your moment.',
    options: [
      { id: 'shift', label: 'Shift change, 2 a.m.', stat: 'discipline', base: 0.55 },
      { id: 'riot', label: 'Start a commotion in the yard', stat: 'charisma', base: 0.5 },
      { id: 'laundry', label: 'The laundry truck', stat: 'creativity', base: 0.5 },
    ],
  },
  {
    id: 'route',
    prompt: 'Which way out?',
    options: [
      { id: 'vents', label: 'Through the vents', stat: 'discipline', base: 0.5 },
      { id: 'guard', label: 'Talk a guard into looking away', stat: 'charisma', base: 0.45 },
      { id: 'kitchen', label: 'Out the kitchen loading dock', stat: 'talent', base: 0.5 },
    ],
  },
  {
    id: 'fence',
    prompt: 'The fence.',
    options: [
      { id: 'climb', label: 'Climb it', stat: 'discipline', base: 0.5 },
      { id: 'cut', label: 'Cut it', stat: 'creativity', base: 0.5 },
      { id: 'run', label: 'Run for the gate as it opens', stat: 'charisma', base: 0.45 },
    ],
  },
];

/** Odds of one move working, from the stat behind it. */
export function escapeOdds(base: number, statValue: number): number {
  return Math.max(0.15, Math.min(0.9, base + (statValue - 50) / 200));
}

/** Weekly chance a fugitive gets caught, rising the longer they run. */
export function captureChance(weeksOnRun: number): number {
  return Math.min(0.85, 0.3 + weeksOnRun * 0.08);
}

/** Weeks on the run before the manhunt goes cold. */
export const MANHUNT_WEEKS = 8;
