import type { Npc } from '../../types/world';
import type { Signee, Venture, VentureDef } from '../../types/mogul';

/**
 * The mogul layer. Pure: what a label costs, who is worth signing, what a
 * signee earns the label, how a business does in a week.
 */

export const LABEL_COST = 200_000;
export const LABEL_MIN_FANS = 250_000;
export const LABEL_MIN_LEVEL = 14;
/** The label's default cut of a signee's money. */
export const DEFAULT_SHARE = 0.4;
/** Weeks between marketing pushes for the same signee. */
export const PUSH_COOLDOWN = 4;
/** Scouting refreshes this often. */
export const SCOUT_WEEKS = 4;
export const SCOUT_SIZE = 6;
export const MAX_ROSTER = 5;

export type Check = { ok: true } | { ok: false; reason: string };

export function canStartLabel(fans: number, level: number, money: number, hasLabel: boolean): Check {
  if (hasLabel) return { ok: false, reason: 'You already run a label' };
  if (fans < LABEL_MIN_FANS && level < LABEL_MIN_LEVEL) {
    return { ok: false, reason: `${LABEL_MIN_FANS.toLocaleString('en-US')} fans or level ${LABEL_MIN_LEVEL}` };
  }
  if (money < LABEL_COST) return { ok: false, reason: `Needs $${LABEL_COST.toLocaleString('en-US')}` };
  return { ok: true };
}

/** How much a young artist could become: talent, marketability, momentum. */
export function potential(npc: Npc): number {
  return Math.round(
    npc.reputation.talent * 0.5 + npc.reputation.marketability * 0.35 + Math.max(0, npc.momentum) * 0.15
  );
}

/** Artists worth a look: unsigned-by-you, early in their careers, best potential first. */
export function scoutPool(npcs: Npc[], signedIds: Set<string>): Npc[] {
  return npcs
    .filter(
      (n) =>
        n.role === 'artist' &&
        n.active &&
        (n.stage === 'undiscovered' || n.stage === 'rising') &&
        !signedIds.has(n.id)
    )
    .sort((a, b) => potential(b) - potential(a));
}

/** What it costs to sign them (the advance). */
export function signingCost(npc: Npc): number {
  const raw = 3_000 + npc.social.followers * 0.6 + npc.reputation.talent * 250;
  return Math.round(Math.min(2_000_000, raw) / 500) * 500;
}

/** What a marketing push for them costs. */
export function pushCost(npc: Npc): number {
  return Math.round(Math.min(250_000, 4_000 + npc.social.followers * 0.05) / 500) * 500;
}

/** The label's money from a signee this week. */
export function signeeIncome(signee: Signee, npc: Npc): number {
  const momentum = 1 + Math.max(-0.5, Math.min(0.8, npc.momentum / 100));
  const gross = npc.social.followers * 0.012 * momentum;
  return Math.round(gross * signee.share);
}

/**
 * Loyalty drifts: down when they outgrow the deal or have a big ego, up when
 * the label pushes them. Returns the new loyalty.
 */
export function loyaltyDrift(signee: Signee, npc: Npc, week: number, stageClimbed: boolean): number {
  let d = 0;
  if (stageClimbed) d -= 12;
  if (npc.personality.ego > 70) d -= 1.5;
  if (npc.personality.loyalty > 65) d += 1;
  if (signee.lastPushWeek !== null && week - signee.lastPushWeek <= 2) d += 2;
  if (signee.share > 0.45 && (npc.stage === 'star' || npc.stage === 'legend')) d -= 3;
  return Math.max(-100, Math.min(100, signee.loyalty + d));
}

/** Will they walk this week? Only stars with no loyalty left leave. */
export function wantsOut(signee: Signee, npc: Npc): boolean {
  return signee.loyalty <= -40 && (npc.stage === 'established' || npc.stage === 'star' || npc.stage === 'legend');
}

/** Fame scale for a business: a bigger name sells more. */
export function fameScale(fans: number): number {
  return Math.max(0.4, Math.min(1.8, Math.log10(Math.max(10, fans)) / 6));
}

/**
 * A week in the life of a business. Health drifts with the stat that keeps
 * it running and a dose of luck; net income follows health and fame.
 */
export function ventureWeek(
  v: Venture,
  def: VentureDef,
  ctx: { fans: number; statValue: number; tilt: number },
  rng: () => number = Math.random
): { health: number; net: number; badWeeks: number } {
  const noise = (rng() * 2 - 1) * def.volatility * 18;
  const drift = (ctx.statValue - 50) / 25 + ctx.tilt / 10 + noise;
  const health = Math.max(0, Math.min(100, v.health + drift));
  const net = Math.round(def.baseIncome * (health / 60 - 0.45) * fameScale(ctx.fans)) - def.upkeep;
  return { health, net, badWeeks: health < 15 ? v.badWeeks + 1 : 0 };
}

/** What selling a business gets back. */
export function ventureSaleValue(v: Venture): number {
  return Math.round((v.invested * (0.25 + (v.health / 100) * 0.75)) / 100) * 100;
}

/** Weeks a business can sit in the red zone before it folds. */
export const FOLD_WEEKS = 3;
