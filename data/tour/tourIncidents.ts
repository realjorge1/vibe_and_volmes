/**
 * Tour incidents are data-driven dramatic beats that can fire at a stop.
 * The tour engine rolls one per stop weighted by `weight`, gated by the
 * stop's performance/exhaustion context. Effects feed the influence bus.
 */
export interface TourIncidentDef {
  id: string;
  weight: number;
  positive: boolean;
  summary: string;            // "{venue} crowd lost it — clip went viral"
  fansDelta: number;
  reputationDelta: number;
  fanLoyaltyDelta: number;
  mentalHit: number;          // burnout/anxiety pressure
  moneyDelta: number;
  controversyRisk: number;    // 0-1
  socialBeat: string;
  // optional gating
  minExhaustion?: number;     // only when player is worn down
  requiresControversyProne?: boolean;
}

export const TOUR_INCIDENTS: TourIncidentDef[] = [
  {
    id: 'viral-clip',
    weight: 14,
    positive: true,
    summary: 'A fan clip of the performance exploded online',
    fansDelta: 0, // scaled by engine vs crowd size
    reputationDelta: 4,
    fanLoyaltyDelta: 5,
    mentalHit: 0,
    moneyDelta: 0,
    controversyRisk: 0,
    socialBeat: 'tour-viral-moment',
  },
  {
    id: 'guest-appearance',
    weight: 8,
    positive: true,
    summary: 'A surprise guest joined you on stage',
    fansDelta: 0,
    reputationDelta: 6,
    fanLoyaltyDelta: 7,
    mentalHit: -2,
    moneyDelta: 0,
    controversyRisk: 0,
    socialBeat: 'tour-surprise-guest',
  },
  {
    id: 'celebrity-sighting',
    weight: 7,
    positive: true,
    summary: 'A major celebrity was spotted in the crowd',
    fansDelta: 0,
    reputationDelta: 3,
    fanLoyaltyDelta: 2,
    mentalHit: 0,
    moneyDelta: 0,
    controversyRisk: 0.1,
    socialBeat: 'tour-celebrity-sighting',
  },
  {
    id: 'flawless-night',
    weight: 16,
    positive: true,
    summary: 'You delivered a career-best performance',
    fansDelta: 0,
    reputationDelta: 5,
    fanLoyaltyDelta: 8,
    mentalHit: -4,
    moneyDelta: 0,
    controversyRisk: 0,
    socialBeat: 'tour-flawless-night',
  },
  {
    id: 'booing-incident',
    weight: 9,
    positive: false,
    summary: 'The crowd turned on you mid-set',
    fansDelta: 0,
    reputationDelta: -6,
    fanLoyaltyDelta: -5,
    mentalHit: 9,
    moneyDelta: 0,
    controversyRisk: 0.2,
    socialBeat: 'tour-booed',
    minExhaustion: 45,
  },
  {
    id: 'vocal-injury',
    weight: 7,
    positive: false,
    summary: 'You strained your voice and had to cut the set short',
    fansDelta: 0,
    reputationDelta: -3,
    fanLoyaltyDelta: -2,
    mentalHit: 12,
    moneyDelta: -8_000,
    controversyRisk: 0,
    socialBeat: 'tour-injury',
    minExhaustion: 55,
  },
  {
    id: 'crowd-fight',
    weight: 6,
    positive: false,
    summary: 'A fight broke out in the pit and the show was paused',
    fansDelta: 0,
    reputationDelta: -2,
    fanLoyaltyDelta: -1,
    mentalHit: 6,
    moneyDelta: -3_000,
    controversyRisk: 0.25,
    socialBeat: 'tour-crowd-fight',
  },
  {
    id: 'stage-collapse',
    weight: 3,
    positive: false,
    summary: 'Part of the stage rig failed — show evacuated',
    fansDelta: 0,
    reputationDelta: -8,
    fanLoyaltyDelta: -3,
    mentalHit: 18,
    moneyDelta: -40_000,
    controversyRisk: 0.5,
    socialBeat: 'tour-stage-collapse',
  },
  {
    id: 'backstage-leak',
    weight: 6,
    positive: false,
    summary: 'Backstage footage you did not want public got leaked',
    fansDelta: 0,
    reputationDelta: -7,
    fanLoyaltyDelta: -2,
    mentalHit: 10,
    moneyDelta: 0,
    controversyRisk: 0.6,
    socialBeat: 'tour-backstage-leak',
    requiresControversyProne: true,
  },
  {
    id: 'meltdown-on-stage',
    weight: 5,
    positive: false,
    summary: 'You had a visible breakdown on stage',
    fansDelta: 0,
    reputationDelta: -10,
    fanLoyaltyDelta: 3, // some fans rally protectively
    mentalHit: 22,
    moneyDelta: 0,
    controversyRisk: 0.55,
    socialBeat: 'tour-meltdown',
    minExhaustion: 70,
  },
];
