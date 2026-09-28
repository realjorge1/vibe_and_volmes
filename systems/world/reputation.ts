import type {
  CareerStage,
  Npc,
  ReputationDimensions,
} from '../../types/world';
import type { Rng } from './rng';
import { clamp } from './rng';

/**
 * Reputation & career-stage subsystem. The five reputation axes are
 * independent and drive everything downstream: which opportunities open,
 * how fans react, and how much press an NPC's actions generate.
 */

const REP_KEYS: (keyof ReputationDimensions)[] = [
  'talent',
  'authenticity',
  'professionalism',
  'marketability',
  'influence',
];

/** Map a raw follower/fan count to a 0-100 fame level on a log curve. */
export function fameLevel(followers: number): number {
  if (followers <= 0) return 0;
  // 1k -> ~30, 100k -> ~60, 10M -> ~93
  return clamp(Math.log10(followers + 1) * 13, 0, 100);
}

/** Audience size that defines an NPC's reach (fans for artists, else followers). */
export function reach(npc: Npc): number {
  return npc.roleData.fans ?? npc.social.followers;
}

/**
 * Determine career stage from reach + trajectory + health. `retired` and
 * `declining` are state-driven; the rest are reach thresholds.
 */
export function careerStageFor(npc: Npc): CareerStage {
  if (!npc.active) return 'retired';
  const r = reach(npc);
  const base: CareerStage =
    r >= 5_000_000
      ? 'legend'
      : r >= 500_000
        ? 'star'
        : r >= 50_000
          ? 'established'
          : r >= 1_000
            ? 'rising'
            : 'undiscovered';

  // Sustained negative momentum past a real audience reads as decline.
  if (npc.momentum <= -35 && (base === 'star' || base === 'established' || base === 'legend')) {
    return 'declining';
  }
  return base;
}

export function applyReputationDelta(
  npc: Npc,
  delta: Partial<ReputationDimensions>,
): void {
  for (const key of REP_KEYS) {
    const d = delta[key];
    if (d === undefined) continue;
    npc.reputation[key] = clamp(npc.reputation[key] + d, 0, 100);
  }
}

/**
 * Opportunity scoring (0-100). Different doors weight the five axes
 * differently — a label cares about marketability & professionalism, the
 * culture cares about influence & authenticity, awards care about talent.
 * Engines read this to decide whether an NPC *qualifies* for an event.
 */
export type OpportunityKind =
  | 'label-interest'
  | 'collab-appeal'
  | 'award-worthiness'
  | 'viral-potential'
  | 'romance-appeal';

export function opportunityScore(npc: Npc, kind: OpportunityKind): number {
  const r = npc.reputation;
  const f = fameLevel(reach(npc));
  switch (kind) {
    case 'label-interest':
      return clamp(r.marketability * 0.4 + r.professionalism * 0.25 + f * 0.35, 0, 100);
    case 'collab-appeal':
      return clamp(r.talent * 0.3 + r.influence * 0.3 + r.professionalism * 0.2 + f * 0.2, 0, 100);
    case 'award-worthiness':
      return clamp(r.talent * 0.45 + r.authenticity * 0.25 + r.influence * 0.3, 0, 100);
    case 'viral-potential':
      return clamp(r.influence * 0.4 + r.marketability * 0.3 + f * 0.3, 0, 100);
    case 'romance-appeal':
      return clamp(r.marketability * 0.35 + f * 0.35 + npc.personality.warmth * 0.3, 0, 100);
  }
}

/**
 * Weekly passive reputation drift. Reputation gravitates slowly toward a
 * personality-driven equilibrium and is nudged by momentum, so an NPC on a
 * hot streak gradually looks more talented/marketable to the public while a
 * fading one slips. Real swings come from events; this is just the tide.
 */
export function driftReputation(npc: Npc, rng: Rng): void {
  const p = npc.personality;
  const momentumPull = npc.momentum / 100; // -1..1

  const equilibrium: ReputationDimensions = {
    talent: 35 + p.workEthic * 0.3 + p.openness * 0.1,
    authenticity: 40 + p.loyalty * 0.2 - p.ego * 0.15,
    professionalism: 30 + p.workEthic * 0.4 - p.volatility * 0.2,
    marketability: 35 + p.warmth * 0.2 + p.ambition * 0.2,
    influence: 25 + p.ego * 0.15 + p.ambition * 0.15,
  };

  for (const key of REP_KEYS) {
    const toward = equilibrium[key] - npc.reputation[key];
    const drift = toward * 0.03 + momentumPull * 0.8 + rng.gauss(0, 0.4);
    npc.reputation[key] = clamp(npc.reputation[key] + drift, 0, 100);
  }
}

/** Average reputation — a quick "how big a deal are they" scalar. */
export function reputationAverage(npc: Npc): number {
  const r = npc.reputation;
  return (r.talent + r.authenticity + r.professionalism + r.marketability + r.influence) / 5;
}
