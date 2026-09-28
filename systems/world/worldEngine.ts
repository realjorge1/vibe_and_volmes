import type {
  Npc,
  NpcRelationship,
  WorldEvent,
  WorldState,
} from '../../types/world';
import { Rng, clamp, hash32 } from './rng';
import { careerStageFor, driftReputation, reach } from './reputation';
import { decayRelationship, getOrCreateRelationship } from './relationships';
import {
  EVENTS_BY_ROLE,
  type EventDraft,
  type NpcEventDef,
  type TargetFilter,
  type WorldEventContext,
} from '../../data/world/npcEvents';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE WEEKLY SIMULATION TICK
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `simulateWeek` is a *pure* function: given a WorldState it returns a brand
 * new WorldState advanced by one week, plus the events that occurred. It
 * never reads wall-clock time or Math.random, so the same input always
 * yields the same output — the foundation of the deterministic guarantee.
 *
 * Each NPC's randomness is derived from hash(seed, week, npcIndex), making
 * per-NPC processing order-stable and safe to batch.
 *
 * Per NPC, per week:
 *   1. Passive life      — health/finances/social/reputation drift, decay.
 *   2. Active events     — up to MAX_EVENTS rolled from the weighted catalog,
 *                          gated by per-NPC condition + cooldown.
 *   3. Stage recompute   — career stage re-derived from the new numbers.
 */

const MAX_EVENTS_PER_NPC = 2;
/** Weight of "nothing newsworthy happens" — keeps the world from over-firing. */
const NO_EVENT_WEIGHT_FIRST = 14;
const NO_EVENT_WEIGHT_SECOND = 42;
const EVENT_LOG_CAP = 300;

// ─── Deep clone (data is JSON-safe: only numbers/strings/arrays/records) ─────

function cloneRelationship(rel: NpcRelationship): NpcRelationship {
  return {
    targetId: rel.targetId,
    status: rel.status,
    dims: { ...rel.dims },
    sinceWeek: rel.sinceWeek,
    lastInteractionWeek: rel.lastInteractionWeek,
    history: rel.history.slice(),
  };
}

export function cloneNpc(npc: Npc): Npc {
  const relationships: Record<string, NpcRelationship> = {};
  for (const key of Object.keys(npc.relationships)) {
    relationships[key] = cloneRelationship(npc.relationships[key]);
  }
  return {
    ...npc,
    personality: { ...npc.personality },
    reputation: { ...npc.reputation },
    relationships,
    goals: npc.goals.map((g) => ({ ...g })),
    finances: { ...npc.finances },
    health: { ...npc.health },
    social: { ...npc.social },
    roleData: {
      ...npc.roleData,
      roster: npc.roleData.roster ? npc.roleData.roster.slice() : undefined,
    },
    tags: npc.tags.slice(),
    cooldowns: { ...npc.cooldowns },
  };
}

export function cloneWorld(world: WorldState): WorldState {
  const npcs: Record<string, Npc> = {};
  for (const id of world.npcIds) npcs[id] = cloneNpc(world.npcs[id]);
  return {
    seed: world.seed,
    week: world.week,
    npcs,
    npcIds: world.npcIds.slice(),
    events: world.events.slice(),
    eventCount: world.eventCount,
    retiredCount: world.retiredCount,
  };
}

// ─── Passive weekly life (the slow tide every NPC drifts on) ─────────────────

function livePassively(npc: Npc, rng: Rng, week: number): void {
  // Momentum is mean-reverting: hot streaks and slumps both fade over time.
  npc.momentum = clamp(npc.momentum * 0.9 + rng.gauss(0, 2), -100, 100);

  // Outrage cools off week over week.
  npc.social.controversyHeat = Math.max(0, npc.social.controversyHeat - rng.int(4, 11));

  // Health: touring/output burns energy; rest and treatment restore it.
  const onTour = npc.tags.includes('on-tour');
  const burnDelta = (onTour ? rng.int(2, 6) : -rng.int(1, 4)) + (npc.personality.workEthic > 70 ? 1 : 0);
  npc.health.burnout = clamp(npc.health.burnout + burnDelta, 0, 100);

  const mentalDelta =
    (npc.health.inTreatment ? rng.int(3, 7) : 0) +
    (npc.health.burnout > 60 ? -rng.int(1, 5) : 1) -
    npc.social.controversyHeat * 0.04 +
    rng.gauss(0, 1);
  npc.health.mental = clamp(npc.health.mental + mentalDelta, 0, 100);

  const addictDelta =
    (npc.health.inTreatment ? -rng.int(2, 5) : 0) +
    (npc.health.mental < 35 && npc.personality.volatility > 55 ? rng.int(1, 3) : -0.5);
  npc.health.addiction = clamp(npc.health.addiction + addictDelta, 0, 100);

  npc.health.physical = clamp(npc.health.physical + (75 - npc.health.physical) * 0.05 + (onTour ? -rng.int(1, 3) : 0), 0, 100);
  if (npc.health.inTreatment && npc.health.mental > 65 && rng.chance(0.3)) {
    npc.health.inTreatment = false;
  }

  // Finances settle weekly; income tracks current reach.
  const earned = Math.max(npc.finances.weeklyIncome, Math.round(reach(npc) * 0.004));
  npc.finances.weeklyIncome = earned;
  npc.finances.netWorth += earned - npc.finances.weeklyBurn;
  npc.finances.inDebt = npc.finances.netWorth < 0;

  // Social cadence + engagement drift toward a personal baseline.
  if (npc.social.weeklyPostRate > 0 && rng.chance(0.7)) npc.social.lastPostWeek = week;
  npc.social.engagement = clamp(npc.social.engagement + (50 - npc.social.engagement) * 0.04 + rng.gauss(0, 2), 0, 100);

  // Reputation tide.
  driftReputation(npc, rng);

  // Neglected relationships fade toward neutral.
  for (const key of Object.keys(npc.relationships)) {
    decayRelationship(npc.relationships[key], week);
  }

  // Goal upkeep: drop finished goals, ensure everyone is chasing something.
  npc.goals = npc.goals.filter((g) => g.progress < 100);
  if (npc.goals.length === 0) {
    npc.goals.push({ kind: 'stay-relevant', priority: 40, progress: 0 });
  }
}

// ─── Event resolution helpers ────────────────────────────────────────────────

function makeContext(
  world: WorldState,
  npc: Npc,
  rng: Rng,
  week: number,
  produced: WorldEvent[],
): WorldEventContext {
  const matches = (other: Npc | undefined, filter?: TargetFilter): other is Npc => {
    if (!other || other.id === npc.id || !other.active) return false;
    if (filter?.roles && !filter.roles.includes(other.role)) return false;
    if (filter?.sameGenre && other.genre !== npc.genre) return false;
    if (filter?.minReach && reach(other) < filter.minReach) return false;
    return true;
  };

  const findTarget = (filter?: TargetFilter): Npc | null => {
    const wantKnown = filter?.relation === 'known';
    const wantStranger = filter?.relation === 'stranger';

    if (wantKnown) {
      const cands: Npc[] = [];
      for (const key of Object.keys(npc.relationships)) {
        const o = world.npcs[key];
        if (matches(o, filter)) cands.push(o);
      }
      return cands.length ? rng.pick(cands) : null;
    }

    // Sample a handful of random NPCs (cheap on a world of thousands).
    const ids = world.npcIds;
    for (let i = 0; i < 14; i++) {
      const o = world.npcs[ids[rng.int(0, ids.length - 1)]];
      if (!matches(o, filter)) continue;
      if (wantStranger && npc.relationships[o.id]) continue;
      return o;
    }
    // Fallback for 'any': reuse an existing tie for story continuity.
    if (!wantStranger) {
      const cands: Npc[] = [];
      for (const key of Object.keys(npc.relationships)) {
        const o = world.npcs[key];
        if (matches(o, filter)) cands.push(o);
      }
      if (cands.length) return rng.pick(cands);
    }
    return null;
  };

  const findKnown = (
    pred: (rel: NpcRelationship, other: Npc) => boolean,
  ): Npc | null => {
    const cands: Npc[] = [];
    for (const key of Object.keys(npc.relationships)) {
      const o = world.npcs[key];
      if (o && o.active && pred(npc.relationships[key], o)) cands.push(o);
    }
    return cands.length ? rng.pick(cands) : null;
  };

  const emit = (draft: EventDraft): void => {
    const ev: WorldEvent = {
      id: `evt-${world.eventCount++}`,
      week,
      type: draft.type,
      primaryId: npc.id,
      secondaryId: draft.secondary ? draft.secondary.id : null,
      headline: draft.headline,
      magnitude: Math.round(draft.magnitude),
      tags: draft.tags ?? [],
    };
    produced.push(ev);
  };

  return {
    world,
    npc,
    rng,
    week,
    findTarget,
    findKnown,
    rel: (target) => getOrCreateRelationship(npc, target.id, week),
    relBack: (target) => getOrCreateRelationship(target, npc.id, week),
    emit,
  };
}

function runEvents(ctx: WorldEventContext): void {
  const { npc, rng, week } = ctx;
  // Eligible = role events whose condition passes and cooldown has elapsed.
  const eligible: NpcEventDef[] = [];
  for (const def of EVENTS_BY_ROLE[npc.role]) {
    const last = npc.cooldowns[def.id];
    if (last !== undefined && week - last < def.cooldownWeeks) continue;
    if (!def.condition(ctx)) continue;
    eligible.push(def);
  }
  if (eligible.length === 0) return;

  const pool = eligible.slice();
  for (let slot = 0; slot < MAX_EVENTS_PER_NPC && pool.length > 0; slot++) {
    const noEventW = slot === 0 ? NO_EVENT_WEIGHT_FIRST : NO_EVENT_WEIGHT_SECOND;
    let total = noEventW;
    const weights = pool.map((def) => {
      const w = Math.max(0, def.weight(ctx));
      total += w;
      return w;
    });
    let r = rng.next() * total;
    r -= noEventW;
    if (r <= 0) return; // "nothing happens" — most common outcome
    let chosenIndex = -1;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) { chosenIndex = i; break; }
    }
    if (chosenIndex < 0) chosenIndex = pool.length - 1;
    const def = pool[chosenIndex];
    def.apply(ctx);
    npc.cooldowns[def.id] = week;
    pool.splice(chosenIndex, 1);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface WeekResult {
  world: WorldState;
  events: WorldEvent[];
}

/**
 * Advance the world by exactly one week. Pure: returns a new WorldState and
 * the events generated, leaving the input untouched.
 */
export function simulateWeek(prev: WorldState): WeekResult {
  const world = cloneWorld(prev);
  world.week = prev.week + 1;
  const week = world.week;
  const weekSeed = hash32(world.seed, week);
  const produced: WorldEvent[] = [];

  const ids = world.npcIds;
  for (let i = 0; i < ids.length; i++) {
    const npc = world.npcs[ids[i]];
    if (!npc.active) continue; // retired NPCs rest in the history books

    const rng = new Rng(hash32(weekSeed, i));
    livePassively(npc, rng, week);
    const ctx = makeContext(world, npc, rng, week, produced);
    runEvents(ctx);
    npc.stage = careerStageFor(npc);
  }

  // Newest + biggest stories first; keep a bounded rolling log.
  produced.sort((a, b) => b.magnitude - a.magnitude);
  world.events = [...produced, ...world.events].slice(0, EVENT_LOG_CAP);

  return { world, events: produced };
}

/** Advance the world by `weeks` and return the final state. */
export function simulateWeeks(prev: WorldState, weeks: number): WorldState {
  let world = prev;
  for (let i = 0; i < weeks; i++) world = simulateWeek(world).world;
  return world;
}

// ─── Read-only summaries (handy for UI, debugging and tests) ─────────────────

export interface WorldSummary {
  week: number;
  activeNpcs: number;
  retired: number;
  totalReach: number;
  biggestStar: { id: string; name: string; reach: number } | null;
  recentHeadlines: string[];
}

export function summarizeWorld(world: WorldState): WorldSummary {
  let active = 0;
  let totalReach = 0;
  let biggest: { id: string; name: string; reach: number } | null = null;
  for (const id of world.npcIds) {
    const npc = world.npcs[id];
    if (!npc.active) continue;
    active++;
    const r = reach(npc);
    totalReach += r;
    if (!biggest || r > biggest.reach) biggest = { id, name: npc.name, reach: r };
  }
  return {
    week: world.week,
    activeNpcs: active,
    retired: world.retiredCount,
    totalReach,
    biggestStar: biggest,
    recentHeadlines: world.events.slice(0, 8).map((e) => e.headline),
  };
}
