import type { Player, PlayerStats } from '../../types/player';
import type {
  ActivityId,
  ActivityEffect,
  DayPlan,
  PlanOutcome,
  Storyline,
} from '../../types/passive';
import type { XpSource } from '../../types/progression';
import { getActivity } from '../../data/passive/activities';
import { PASSIVE_CONFIG } from '../../constants/passiveConfig';
import { rollCuriosity } from './curiosityEngine';
import { randFloat, clamp, pick } from '../../utils/random';

/**
 * The away-simulation core. Resolves the player's repeating DayPlan over a
 * CAPPED slice of real-time into a bounded, fully-reportable PlanOutcome.
 *
 * Decorator discipline: this is PURE — it reads player state + context and
 * returns deltas; the live tick is what applies them (and clamps energy/stats
 * at the store). Every channel (money, stats, XP, affinity, fan drift) is
 * clamped against PASSIVE_CONFIG so a week offline can never out-earn or
 * out-grind sitting down and actually playing.
 */

export interface ResolveContext {
  /** Known artists the plan can warm up via networking/social affinity. */
  knownArtists: { id: string; name: string }[];
  /** In-flight curiosity storylines (advanced + returned). */
  storylines: Storyline[];
  /** Activities currently boosted by a live scheduled/community event. */
  boostActivities: Set<ActivityId>;
  now: number;
}

export interface ResolveResult {
  outcome: PlanOutcome;
  storylines: Storyline[];
}

const RESULT_PHRASE: Record<ActivityId, string> = {
  studio: 'sharpened your craft',
  songwriting: 'filled the notebook',
  promotion: 'pushed the music',
  social: 'stayed in the conversation',
  networking: 'worked the rooms',
  press: 'ran the media circuit',
  fitness: 'trained and recovered',
  rest: 'recharged',
};

const BOOST_MULT = 1.35;

function roll([a, b]: [number, number]): number {
  return randFloat(a, b);
}

export function resolvePlan(
  player: Player,
  plan: DayPlan,
  awayMs: number,
  ctx: ResolveContext
): ResolveResult {
  const resolvedSlots = Math.min(
    Math.floor(awayMs / PASSIVE_CONFIG.SLOT_MS),
    PASSIVE_CONFIG.MAX_RESOLVED_SLOTS
  );

  const slotCounts: Partial<Record<ActivityId, number>> = {};
  const statAccum: Partial<Record<keyof PlayerStats, number>> = {};
  const xpAccum: Partial<Record<XpSource, number>> = {};
  let earnings = 0;
  let energyDelta = 0;
  let affinityTotal = 0;
  let fanDriftSum = 0;
  let fanDriftCount = 0;

  const applyEffect = (effect: ActivityEffect, boost: number): void => {
    if (effect.earn) earnings += roll(effect.earn) * boost;
    if (effect.stats) {
      for (const [stat, range] of Object.entries(effect.stats) as Array<
        [keyof PlayerStats, [number, number]]
      >) {
        statAccum[stat] = (statAccum[stat] ?? 0) + roll(range);
      }
    }
    if (effect.energy) energyDelta += roll(effect.energy);
    if (effect.affinity) affinityTotal += roll(effect.affinity);
    if (effect.xp) {
      xpAccum[effect.xp.source] =
        (xpAccum[effect.xp.source] ?? 0) + roll(effect.xp.amount) * boost;
    }
  };

  const slots = plan.slots.length > 0 ? plan.slots : [null];
  for (let i = 0; i < resolvedSlots; i++) {
    const id = slots[i % slots.length];
    if (!id) {
      // A free slot = neutral, but the world still drifts.
      fanDriftSum += 1;
      fanDriftCount++;
      continue;
    }
    const act = getActivity(id);
    if (!act) continue;
    slotCounts[id] = (slotCounts[id] ?? 0) + 1;
    const boosted = ctx.boostActivities.has(id);
    applyEffect(act.effect, boosted ? BOOST_MULT : 1);
    fanDriftSum += (act.effect.fanDriftMult ?? 1) * (boosted ? 1.1 : 1);
    fanDriftCount++;
  }

  // Fold in curiosity (also advances storylines) — bounded one-shot deltas.
  const cur = rollCuriosity({
    slotCounts,
    artistName: player.artistName,
    storylines: ctx.storylines,
    now: ctx.now,
  });
  for (const eff of cur.effects) {
    applyEffect(eff, 1);
    if (eff.fanDriftMult) {
      fanDriftSum += eff.fanDriftMult;
      fanDriftCount++;
    }
  }

  // ── Clamp every channel ───────────────────────────────────────────────
  earnings = clamp(Math.round(earnings), 0, PASSIVE_CONFIG.MAX_EARN_PER_RESUME);

  const statChanges = (
    Object.entries(statAccum) as Array<[keyof PlayerStats, number]>
  )
    .map(([stat, v]) => ({
      stat,
      delta: clamp(
        Math.round(v),
        -PASSIVE_CONFIG.MAX_STAT_NUDGE,
        PASSIVE_CONFIG.MAX_STAT_NUDGE
      ),
    }))
    .filter((c) => c.delta !== 0);

  energyDelta = clamp(Math.round(energyDelta), -15, 25);

  const affinityChanges: PlanOutcome['affinityChanges'] = [];
  const affDelta = clamp(
    Math.round(affinityTotal),
    -PASSIVE_CONFIG.MAX_AFFINITY_NUDGE,
    PASSIVE_CONFIG.MAX_AFFINITY_NUDGE
  );
  if (affDelta !== 0 && ctx.knownArtists.length > 0) {
    const target = pick(ctx.knownArtists);
    affinityChanges.push({ artistId: target.id, name: target.name, delta: affDelta });
  }

  // XP — scaled down so the total never exceeds the passive cap.
  const totalXp = Object.values(xpAccum).reduce((s, v) => s + (v ?? 0), 0);
  const scale =
    totalXp > PASSIVE_CONFIG.MAX_PASSIVE_XP
      ? PASSIVE_CONFIG.MAX_PASSIVE_XP / totalXp
      : 1;
  const xpGrants: PlanOutcome['xpGrants'] = (
    Object.entries(xpAccum) as Array<[XpSource, number]>
  )
    .map(([source, amt]) => ({
      source,
      amount: Math.round(amt * scale),
      label: 'While you were away',
    }))
    .filter((g) => g.amount > 0);

  const fanDriftMult =
    fanDriftCount > 0 ? clamp(fanDriftSum / fanDriftCount, 0.8, 2.0) : 1;

  const planResults = (
    Object.entries(slotCounts) as Array<[ActivityId, number]>
  ).map(([id, count]) => {
    const act = getActivity(id);
    const boost = ctx.boostActivities.has(id) ? ' · event boost' : '';
    return `${act?.label ?? id} × ${count} — ${RESULT_PHRASE[id]}${boost}`;
  });

  const outcome: PlanOutcome = {
    resolvedSlots,
    slotCounts,
    earnings,
    statChanges,
    energyDelta,
    fanDriftMult,
    affinityChanges,
    xpGrants,
    curiosity: cur.results,
    planResults,
  };

  return { outcome, storylines: cur.storylines };
}
