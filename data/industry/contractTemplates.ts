import type { ContractTerms, DealKind, LabelProfile } from '../../types/industry';

/**
 * Contracts are generated, not hardcoded: a label's strictness/exploitation
 * and the artist's leverage (fame) bend these baselines. This keeps the
 * negotiation space data-driven and expandable per deal kind.
 */
interface TermBaseline {
  royaltyPct: number;
  creativeControl: number;
  durationWeeks: number;
  releaseQuota: number;
  ownsMasters: boolean;
  touringObligation: number;
  advanceMultiplier: number; // x label budget fraction
}

const BASELINES: Record<DealKind, TermBaseline> = {
  recording: {
    royaltyPct: 22,
    creativeControl: 55,
    durationWeeks: 52,
    releaseQuota: 3,
    ownsMasters: false,
    touringObligation: 45,
    advanceMultiplier: 0.12,
  },
  publishing: {
    royaltyPct: 50,
    creativeControl: 80,
    durationWeeks: 78,
    releaseQuota: 0,
    ownsMasters: true,
    touringObligation: 0,
    advanceMultiplier: 0.06,
  },
  management: {
    royaltyPct: 80, // they take 20%
    creativeControl: 90,
    durationWeeks: 104,
    releaseQuota: 0,
    ownsMasters: true,
    touringObligation: 30,
    advanceMultiplier: 0.0,
  },
  sponsorship: {
    royaltyPct: 100,
    creativeControl: 70,
    durationWeeks: 26,
    releaseQuota: 0,
    ownsMasters: true,
    touringObligation: 10,
    advanceMultiplier: 0.2,
  },
};

/**
 * Build terms for a specific label+deal. `leverage` is 0..1 (artist's
 * negotiating power from fame/industry respect): higher leverage pulls
 * royalty/creative-control/masters toward the artist's favor.
 */
export function buildContractTerms(
  label: LabelProfile,
  kind: DealKind,
  leverage: number
): ContractTerms {
  const b = BASELINES[kind];
  const strict = label.strictness / 100;
  const exploit = label.exploitation / 100;
  const lev = Math.max(0, Math.min(1, leverage));

  const royaltyPct = Math.round(
    clampNum(b.royaltyPct - exploit * 12 + lev * 20, 8, 92)
  );
  const creativeControl = Math.round(
    clampNum(b.creativeControl - strict * 35 + lev * 25, 5, 100)
  );
  const durationWeeks = Math.round(
    b.durationWeeks * (1 + strict * 0.6 - lev * 0.3)
  );
  const releaseQuota = Math.max(
    0,
    Math.round(b.releaseQuota * (1 + strict * 0.8))
  );
  const ownsMasters = b.ownsMasters ? true : lev > 0.75;
  const touringObligation = Math.round(
    clampNum(b.touringObligation + strict * 30 - lev * 20, 0, 100)
  );
  const advance = Math.round(
    label.budget * b.advanceMultiplier * (0.5 + lev)
  );

  return {
    royaltyPct,
    creativeControl,
    durationWeeks,
    releaseQuota,
    ownsMasters,
    touringObligation,
    advance,
  };
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export const DEAL_KIND_LABEL: Record<DealKind, string> = {
  recording: 'Recording Deal',
  publishing: 'Publishing Deal',
  management: 'Management Deal',
  sponsorship: 'Sponsorship Deal',
};
