import type { InfluenceBundle, MentalState } from '../../types/industry';
import type { PlayerStats } from '../../types/player';

/**
 * The interconnection backbone. Every Phase 3 subsystem pushes its weekly
 * effects into a single InfluenceBundle instead of mutating stores directly.
 * The graph then resolves SECOND-ORDER effects (system → system) so the
 * simulation feels interconnected rather than additive, and the tick
 * applies the resolved bundle exactly once. This is what makes a tour's
 * exhaustion bleed into mental health, a scandal bleed into streams, and
 * paranoia bleed into decision-quality.
 */

export function emptyBundle(): InfluenceBundle {
  return {
    statDeltas: {},
    fansDelta: 0,
    moneyDelta: 0,
    mentalDeltas: {},
    addTags: [],
    removeTags: [],
    socialBeats: [],
    historyRecords: [],
    notes: [],
  };
}

export function addStat(
  b: InfluenceBundle,
  stat: keyof PlayerStats,
  delta: number
): void {
  b.statDeltas[stat] = (b.statDeltas[stat] ?? 0) + delta;
}

export function addMental(
  b: InfluenceBundle,
  axis: keyof MentalState,
  delta: number
): void {
  if (typeof delta !== 'number') return;
  const cur = (b.mentalDeltas[axis] as number) ?? 0;
  (b.mentalDeltas[axis] as number) = cur + delta;
}

export function note(b: InfluenceBundle, text: string): void {
  b.notes.push(text);
}

export function beat(b: InfluenceBundle, text: string): void {
  b.socialBeats.push(text);
}

/**
 * Snapshot of the world the resolver needs to compute cross-effects.
 */
export interface ResolveContext {
  mental: MentalState;
  fans: number;
  reputation: number;
  momentum: number;
  onTour: boolean;
  activeControversyHeat: number; // max heat across active controversies
  hottestRivalry: number;
}

/**
 * Resolve second-order effects. Pure: given the accumulated bundle and a
 * world snapshot, layer on the system→system influences. Run ONCE per week
 * after all subsystems have contributed.
 */
export function resolveInfluences(
  b: InfluenceBundle,
  ctx: ResolveContext
): InfluenceBundle {
  const { mental } = ctx;

  // 1. Mental health → creative & social capacity.
  //    High burnout/depression erode creativity, discipline, charisma.
  const drag =
    (mental.burnout + mental.depression) / 2 / 100; // 0..1
  if (drag > 0.35) {
    addStat(b, 'creativity', -Math.round(drag * 6));
    addStat(b, 'discipline', -Math.round(drag * 5));
    addStat(b, 'charisma', -Math.round(drag * 4));
    if (drag > 0.6) {
      note(b, 'You can feel the exhaustion bleeding into the music.');
    }
  }

  // 2. Anxiety/paranoia → fan loyalty erosion (you pull away from people).
  const withdrawal = (mental.anxiety + mental.paranoia + mental.isolation) / 300;
  if (withdrawal > 0.4) {
    addStat(b, 'fanLoyalty', -Math.round(withdrawal * 5));
  }

  // 3. Addiction risk → volatility: small chance of a sharp mental spike.
  if (mental.addictionRisk > 60 && Math.random() < 0.15) {
    addMental(b, 'depression', 8);
    addMental(b, 'paranoia', 6);
    note(b, 'A bad week. Things almost slipped out of control.');
  }

  // 4. Controversy heat → streams/fans + money suppression.
  if (ctx.activeControversyHeat > 0) {
    const h = ctx.activeControversyHeat / 100;
    b.fansDelta -= Math.round(ctx.fans * 0.02 * h);
    b.moneyDelta -= Math.round(Math.abs(b.moneyDelta) * 0.1 * h);
    addMental(b, 'anxiety', Math.round(h * 5));
    addMental(b, 'paranoia', Math.round(h * 4));
  }

  // 5. Active rivalry pressure → constant low-grade mental tax.
  if (ctx.hottestRivalry > 50) {
    addMental(b, 'paranoia', 2);
  }

  // 6. Touring → exhaustion compounds, but momentum/fame benefit handled
  //    by the tour engine. Here we model the bleed into mental health.
  if (ctx.onTour) {
    addMental(b, 'burnout', 4);
    addMental(b, 'isolation', 2);
  }

  // 7. Negative momentum (decline) → reputation/fan-loyalty soft decay,
  //    positive momentum → small confidence boost.
  if (ctx.momentum < -30) {
    addStat(b, 'fanLoyalty', -2);
    addMental(b, 'depression', 3);
  } else if (ctx.momentum > 40) {
    addMental(b, 'anxiety', -2);
    addMental(b, 'burnout', -1);
  }

  return b;
}
