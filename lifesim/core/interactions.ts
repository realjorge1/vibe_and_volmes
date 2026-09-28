/**
 * Action queue + interaction execution. Every action is a tiny state machine:
 *   route → (handler stages) → finish
 * Scripted `special` handlers implement the multi-step chains (cooking,
 * sleeping, repair, phone services, swimming, baby care). Everything else
 * runs through the generic handler: apply effects pro-rata, gain skill,
 * roll breakage, get on with your life.
 */

import type {
  ActiveAction,
  Lot,
  QueuedAction,
  Sim,
  World,
  WorldObject,
} from './types';
import { newId, clampMotive } from './types';
import { getDef, type ObjectInteraction } from '../data/catalog';
import {
  findObjects,
  findPath,
  findReachableUse,
  objectAt,
  placeObject,
  removeObject,
  spawnProp,
  tileAt,
  usePosition,
} from './grid';
import { gainSkill, setThought } from './sim';
import { chance, pick, randInt } from './rng';
import { logMsg, pushDialog } from './log';
import { THOUGHT } from '../data/names';
import { CAREER_TRACKS } from '../data/careers';
import {
  COOK_FIRE_BASE,
  MEAL_COST,
  PAINTING_SALE_BASE,
  PIZZA_COST,
  QUEUE_MAX,
  SNACK_COST,
  WALK_TILES_PER_MIN,
} from '../data/tuning';
import { electrocute } from './death';

// ─── Money ──────────────────────────────────────────────────────────────────

export function household(world: World, sim: Sim) {
  return sim.householdId ? world.households[sim.householdId] : null;
}

export function chargeHousehold(world: World, sim: Sim, amount: number): boolean {
  const hh = household(world, sim);
  if (!hh || hh.funds < amount) return false;
  hh.funds -= amount;
  return true;
}

// ─── Queueing ───────────────────────────────────────────────────────────────

export function enqueue(world: World, sim: Sim, qa: Omit<QueuedAction, 'id'>): boolean {
  if (sim.dead || sim.npc === 'reaper') return false;
  if (sim.queue.length >= QUEUE_MAX) return false;
  const action: QueuedAction = { ...qa, id: newId(world, 'act') };
  if (qa.forced) {
    // Emergencies jump the line and interrupt whatever was happening.
    if (sim.action) interruptAction(world, sim);
    sim.queue.unshift(action);
  } else {
    sim.queue.push(action);
    // A player command supersedes idle free-will pursuits immediately.
    if (!qa.auto && sim.action?.auto) interruptAction(world, sim);
  }
  return true;
}

export function cancelQueued(world: World, sim: Sim, actionId: string): void {
  if (sim.action?.id === actionId && !sim.action.forced) {
    interruptAction(world, sim);
    return;
  }
  const i = sim.queue.findIndex((a) => a.id === actionId && !a.forced);
  if (i >= 0) sim.queue.splice(i, 1);
}

function releaseClaims(world: World, sim: Sim): void {
  const lot = sim.lotId ? world.lots[sim.lotId] : null;
  if (!lot) return;
  for (const id in lot.objects) {
    const obj = lot.objects[id];
    const i = obj.inUseBy.indexOf(sim.id);
    if (i >= 0) obj.inUseBy.splice(i, 1);
  }
}

export function interruptAction(world: World, sim: Sim): void {
  releaseClaims(world, sim);
  if (sim.asleep) sim.asleep = false;
  if (sim.holding) {
    // Drop whatever was being carried where the sim stands.
    const lot = sim.lotId ? world.lots[sim.lotId] : null;
    const held = lot?.objects[sim.holding];
    if (held) {
      held.carriedBy = null;
      held.x = sim.pos.x;
      held.y = sim.pos.y;
    }
    sim.holding = null;
  }
  sim.action = null;
  sim.path = null;
}

// ─── Availability ───────────────────────────────────────────────────────────

/** Returns a human-readable blocker, or null if the interaction is usable. */
export function interactionAvailable(
  world: World,
  sim: Sim,
  obj: WorldObject,
  inter: ObjectInteraction
): string | null {
  const def = getDef(obj.defId);
  if (obj.carriedBy && obj.carriedBy !== sim.id) return 'Being carried';
  if (sim.npc) return 'On duty';
  if (inter.needsWorking && obj.broken) return 'Broken';
  if (inter.needsBroken && !obj.broken) return 'Not broken';
  if (inter.needsDirty && !obj.dirty) return 'Clean';
  if (inter.adultOnly && sim.age !== 'adult') return 'Adults only';
  if (inter.childOnly && sim.age !== 'child') return 'Kids only';
  if (obj.onFire) return 'On fire!';

  const cost =
    inter.special === 'snack' ? SNACK_COST :
    inter.special === 'prepare_meal' ? MEAL_COST :
    inter.cost ?? 0;
  if (cost > 0) {
    const hh = household(world, sim);
    if (!hh || hh.funds < cost) return 'Not enough §';
  }

  if (inter.sitOn) {
    const capacity = def.w * def.h;
    if (obj.inUseBy.filter((s) => s !== sim.id).length >= capacity) return 'In use';
  }
  if ((inter.special === 'repair' || inter.special === 'clean') && obj.inUseBy.length > 0
    && !obj.inUseBy.includes(sim.id)) return 'In use';

  // Guest etiquette: visitors don't sleep over or use the bathroom fixtures.
  if (sim.visitLeaveAt !== undefined && (inter.special === 'sleep' || inter.special === 'shower'))
    return 'Too polite';

  if (def.id === 'crib') {
    if (!obj.data.babyId) return 'Empty crib';
    const baby = world.sims[obj.data.babyId as string];
    if (!baby || baby.dead) return 'Empty crib';
  }
  if (inter.special === 'pay_bills') {
    const hh = household(world, sim);
    if (!hh || hh.bills.length === 0) return 'No bills';
  }
  if (inter.special === 'swim') {
    const lot = world.lots[sim.lotId!];
    const t = tileAt(lot, obj.x, obj.y);
    if (!t?.pool) return 'No water';
  }
  return null;
}

// ─── Starting actions ───────────────────────────────────────────────────────

export function startNextAction(world: World, sim: Sim): void {
  const qa = sim.queue.shift();
  if (!qa) return;
  const lot = sim.lotId ? world.lots[sim.lotId] : null;
  if (!lot) return;

  const action: ActiveAction = { ...qa, stage: 'route', ticksLeft: 0, data: {} };

  if (qa.kind === 'object') {
    const obj = lot.objects[qa.objectId!];
    const inter = obj ? getDef(obj.defId).interactions.find((i) => i.id === qa.interactionId) : undefined;
    if (!obj || !inter || interactionAvailable(world, sim, obj, inter) !== null) {
      setThought(world, sim, THOUGHT.blocked, 15);
      return;
    }
    const target = usePosition(lot, obj, !!inter.sitOn);
    if (!target) {
      blockedTantrum(world, sim);
      return;
    }
    const path = findPath(lot, sim.pos, target, { sitTarget: !!inter.sitOn });
    if (path === null) {
      blockedTantrum(world, sim);
      return;
    }
    sim.path = path;
    sim.action = action;
    return;
  }

  if (qa.kind === 'social') {
    const target = world.sims[qa.targetSimId!];
    if (!target || target.dead || target.lotId !== sim.lotId) {
      setThought(world, sim, THOUGHT.sad, 15);
      return;
    }
    routeTowardSim(world, sim, target);
    sim.action = action;
    return;
  }

  if (qa.kind === 'goto' || qa.kind === 'system') {
    const path = findPath(lot, sim.pos, { x: qa.x ?? sim.pos.x, y: qa.y ?? sim.pos.y });
    if (path === null) {
      blockedTantrum(world, sim);
      return;
    }
    sim.path = path;
    sim.action = action;
  }
}

function blockedTantrum(world: World, sim: Sim): void {
  // The canonical foot-stomp. Do not silently repath — this is a feature.
  setThought(world, sim, THOUGHT.blocked, 20);
  sim.motives.fun = clampMotive(sim.motives.fun - 3);
}

function routeTowardSim(world: World, sim: Sim, target: Sim): void {
  const lot = world.lots[sim.lotId!]!;
  const candidates = [
    { x: target.pos.x + 1, y: target.pos.y },
    { x: target.pos.x - 1, y: target.pos.y },
    { x: target.pos.x, y: target.pos.y + 1 },
    { x: target.pos.x, y: target.pos.y - 1 },
  ];
  for (const c of candidates) {
    const path = findPath(lot, sim.pos, c);
    if (path !== null) {
      sim.path = path;
      return;
    }
  }
  sim.path = null;
}

// ─── Per-minute execution ───────────────────────────────────────────────────

export function tickSimAction(world: World, sim: Sim): void {
  if (!sim.action) {
    if (sim.queue.length > 0) startNextAction(world, sim);
    if (!sim.action) return;
  }
  const action = sim.action;
  const lot = sim.lotId ? world.lots[sim.lotId] : null;
  if (!lot) return;

  if (action.stage === 'route' || action.stage === 'route2') {
    moveAlongPath(world, sim, lot);
    if (sim.path === null || sim.path.length === 0) {
      sim.path = null;
      if (action.stage === 'route') onArrive(world, sim, lot);
      else onArriveStage2(world, sim, lot);
    }
    return;
  }

  tickStage(world, sim, lot);
}

function moveAlongPath(world: World, sim: Sim, lot: Lot): void {
  if (!sim.path || sim.path.length === 0) {
    sim.path = sim.path ?? [];
    return;
  }
  for (let step = 0; step < WALK_TILES_PER_MIN && sim.path.length > 0; step++) {
    const next = sim.path[0];
    // Dynamic blocker? Try one silent repath; if that fails, tantrum.
    const t = tileAt(lot, next.x, next.y);
    const blockedByFire = t ? t.fire > 0 : true;
    if (blockedByFire) {
      const dest = sim.path[sim.path.length - 1];
      const repath = findPath(lot, sim.pos, dest);
      if (repath === null) {
        blockedTantrum(world, sim);
        interruptAction(world, sim);
        return;
      }
      sim.path = repath;
      return;
    }
    sim.pos = { x: next.x, y: next.y };
    sim.path.shift();
  }
}

// ─── Arrival: claim + handler start ─────────────────────────────────────────

function onArrive(world: World, sim: Sim, lot: Lot): void {
  const action = sim.action!;

  if (action.kind === 'goto' || action.kind === 'system') {
    if (action.label === 'Extinguish') {
      action.stage = 'extinguish';
      action.ticksLeft = 6;
      return;
    }
    if (action.label === 'Panic') {
      action.stage = 'panic';
      action.ticksLeft = 6;
      return;
    }
    finishAction(world, sim, true);
    return;
  }

  if (action.kind === 'social') {
    const target = world.sims[action.targetSimId!];
    if (!target || target.dead || target.lotId !== sim.lotId) {
      interruptAction(world, sim);
      return;
    }
    const d = Math.abs(target.pos.x - sim.pos.x) + Math.abs(target.pos.y - sim.pos.y);
    if (d > 1) {
      // They wandered off — chase once more.
      routeTowardSim(world, sim, target);
      if (sim.path === null) {
        interruptAction(world, sim);
        setThought(world, sim, THOUGHT.sad, 10);
      }
      return;
    }
    action.stage = 'social';
    action.ticksLeft = 8;
    return;
  }

  const obj = lot.objects[action.objectId!];
  const inter = obj ? getDef(obj.defId).interactions.find((i) => i.id === action.interactionId) : undefined;
  if (!obj || !inter) {
    interruptAction(world, sim);
    return;
  }
  const blocked = interactionAvailable(world, sim, obj, inter);
  if (blocked !== null) {
    blockedTantrum(world, sim);
    interruptAction(world, sim);
    return;
  }

  if (inter.sitOn || inter.special === 'repair' || inter.special === 'clean') {
    obj.inUseBy.push(sim.id);
  }
  if (inter.sitOn) action.data.sitting = true;

  action.ticksLeft = inter.duration;
  action.stage = 'using';
  startHandler(world, sim, lot, obj, inter);
}

function onArriveStage2(world: World, sim: Sim, lot: Lot): void {
  const action = sim.action!;
  // Currently only the meal chain uses a second route leg (fridge → stove).
  if (action.data.chain === 'cook') {
    const stove = lot.objects[action.data.stoveId as string];
    if (!stove || stove.broken) {
      interruptAction(world, sim);
      return;
    }
    stove.inUseBy.push(sim.id);
    action.stage = 'cook';
    action.ticksLeft = Math.max(6, 14 - Math.floor(sim.skills.cooking));
  } else if (action.data.chain === 'eat_seat') {
    action.stage = 'using';
    action.data.sitting = true;
  } else {
    finishAction(world, sim, true);
  }
}

// ─── Handler starts ─────────────────────────────────────────────────────────

function startHandler(
  world: World,
  sim: Sim,
  lot: Lot,
  obj: WorldObject,
  inter: ObjectInteraction
): void {
  const action = sim.action!;
  switch (inter.special) {
    case 'sleep': {
      sim.asleep = true;
      const q = getDef(obj.defId).quality ?? 1;
      action.data.energyPerMin = 0.13 + q * 0.05;
      action.ticksLeft = 720; // hard cap; exitWhenFull ends it sooner
      break;
    }
    case 'snack': {
      chargeHousehold(world, sim, SNACK_COST);
      break;
    }
    case 'prepare_meal': {
      chargeHousehold(world, sim, MEAL_COST);
      action.stage = 'get_ingredients';
      action.ticksLeft = 2;
      break;
    }
    case 'repair': {
      action.ticksLeft = Math.max(10, 40 - Math.floor(sim.skills.mechanical) * 3);
      const def = getDef(obj.defId);
      if (def.shockRisk && !world.cheats.unbreakable) {
        const risk = Math.max(0, (10 - sim.skills.mechanical) * 0.015);
        if (chance(world, risk)) {
          electrocute(world, sim);
          interruptAction(world, sim);
          return;
        }
      }
      break;
    }
    case 'swim': {
      // Step off the ladder into the water.
      const poolTile = [
        { x: obj.x + 1, y: obj.y }, { x: obj.x - 1, y: obj.y },
        { x: obj.x, y: obj.y + 1 }, { x: obj.x, y: obj.y - 1 },
        { x: obj.x, y: obj.y },
      ].find((p) => tileAt(lot, p.x, p.y)?.pool);
      if (!poolTile) {
        interruptAction(world, sim);
        return;
      }
      sim.pos = poolTile;
      sim.swimming = true;
      action.ticksLeft = 90;
      break;
    }
    case 'watch_tv': {
      // Grab an adjacent free seat if one exists — comfort while you veg.
      const seat = Object.values(lot.objects).find((o) => {
        const d = getDef(o.defId);
        return (
          (d.category === 'seating') &&
          o.inUseBy.length < d.w * d.h &&
          Math.abs(o.x - obj.x) + Math.abs(o.y - obj.y) <= 4
        );
      });
      if (seat) {
        seat.inUseBy.push(sim.id);
        sim.pos = { x: seat.x, y: seat.y };
        action.data.sitting = true;
      }
      break;
    }
    default:
      break;
  }
}

// ─── Per-minute stage ticking ───────────────────────────────────────────────

function tickStage(world: World, sim: Sim, lot: Lot): void {
  const action = sim.action!;

  // Social stage is resolved in social.ts via the engine (import cycle guard):
  // engine calls tickSocialStage for stage === 'social'.
  if (action.stage === 'social') return;

  if (action.stage === 'panic') {
    // Flail. Accomplish nothing. It's tradition.
    sim.motives.fun = clampMotive(sim.motives.fun - 1);
    action.ticksLeft -= 1;
    if (action.ticksLeft <= 0) finishAction(world, sim, false);
    return;
  }

  if (action.stage === 'extinguish') {
    action.ticksLeft -= 1;
    if (action.ticksLeft <= 0) {
      const cx = action.x ?? sim.pos.x;
      const cy = action.y ?? sim.pos.y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const t = tileAt(lot, cx + dx, cy + dy);
          if (t && t.fire > 0) t.fire = 0;
          const burnee = objectAt(lot, cx + dx, cy + dy);
          if (burnee) burnee.onFire = false;
        }
      }
      sim.motives.hygiene = clampMotive(sim.motives.hygiene - 10);
      logMsg(world, '🧯', `${sim.name} beat back the flames.`);
      finishAction(world, sim, false);
    }
    return;
  }

  if (action.kind !== 'object') {
    finishAction(world, sim, true);
    return;
  }
  const obj = lot.objects[action.objectId!];
  const inter = obj ? getDef(obj.defId).interactions.find((i) => i.id === action.interactionId) : undefined;
  if (!obj || !inter) {
    interruptAction(world, sim);
    return;
  }

  switch (action.stage) {
    case 'get_ingredients': {
      action.ticksLeft -= 1;
      if (action.ticksLeft > 0) return;
      // Pick the nearest working stove the sim can actually route to (badly
      // placed furniture can seal one off). No reachable stove → cold snack.
      const reachable = findReachableUse(lot, sim, (o, d) =>
        (d.id === 'stove' || d.id === 'stove_lux') && !o.broken && o.inUseBy.length === 0
      );
      if (!reachable) {
        action.stage = 'using';
        action.ticksLeft = 8;
        action.data.coldSnack = true;
        return;
      }
      action.data.chain = 'cook';
      action.data.stoveId = reachable.obj.id;
      action.data.fridgeQuality = getDef(obj.defId).quality ?? 1;
      action.stage = 'route2';
      sim.path = reachable.path;
      return;
    }

    case 'cook': {
      action.ticksLeft -= 1;
      gainSkill(sim, 'cooking', 0.8, 1);
      if (action.ticksLeft > 0) return;
      const stove = lot.objects[action.data.stoveId as string];
      const stoveDef = stove ? getDef(stove.defId) : null;
      // The signature hazard: low cooking skill starts kitchen fires.
      const fireChance = Math.max(0.005, COOK_FIRE_BASE - sim.skills.cooking * 0.006);
      if (stove && chance(world, fireChance)) {
        stove.onFire = true;
        const t = tileAt(lot, stove.x, stove.y);
        if (t) t.fire = 1;
        logMsg(world, THOUGHT.fire, `${sim.name} started a kitchen fire!`);
        interruptAction(world, sim);
        return;
      }
      const quality =
        Math.floor(sim.skills.cooking) +
        ((stoveDef?.quality ?? 1) - 1) * 2 +
        ((action.data.fridgeQuality as number) - 1) * 2;
      // Serve on a table if there is one, else eat at the stove.
      const table = Object.values(lot.objects).find((o) => {
        const d = getDef(o.defId);
        return d.id === 'table_dining' || d.id === 'counter' || d.id === 'desk';
      });
      const spot = table ? { x: table.x, y: table.y } : { x: sim.pos.x, y: sim.pos.y };
      const meal = spawnProp(world, lot, 'meal_plate', spot.x, spot.y);
      meal.data.quality = quality;
      meal.data.freshUntil = world.totalMinutes + 240;
      releaseClaims(world, sim);
      sim.action = null;
      // Immediately go eat what you cooked.
      sim.queue.unshift({
        id: newId(world, 'act'),
        kind: 'object',
        label: 'Eat',
        icon: '🍽️',
        objectId: meal.id,
        interactionId: 'eat',
        auto: action.auto,
      });
      return;
    }

    default:
      break;
  }

  // ── Generic using stage ───────────────────────────────────────────────────
  const perMin = 1 / Math.max(1, inter.duration);
  if (inter.effects) {
    for (const key in inter.effects) {
      const m = key as keyof Sim['motives'];
      sim.motives[m] = clampMotive(sim.motives[m] + (inter.effects[m] ?? 0) * perMin);
    }
  }
  if (inter.skill) {
    const leveled = gainSkill(sim, inter.skill.id, inter.skill.perHour, 1);
    if (leveled) {
      logMsg(world, '⭐', `${sim.name} improved ${inter.skill.id} to ${Math.floor(sim.skills[inter.skill.id])}!`);
    }
  }

  // Handler per-minute extras.
  switch (inter.special) {
    case 'sleep': {
      sim.motives.energy = clampMotive(
        sim.motives.energy + (action.data.energyPerMin as number)
      );
      sim.motives.comfort = clampMotive(sim.motives.comfort + 0.08);
      if (sim.motives.energy >= 97) {
        finishAction(world, sim, true);
        return;
      }
      break;
    }
    case 'snack': {
      sim.motives.hunger = clampMotive(sim.motives.hunger + 25 * perMin * (action.data.coldSnack ? 1 : 1));
      break;
    }
    case 'prepare_meal': {
      // Cold-snack fallback (no stove): quick hunger fill.
      sim.motives.hunger = clampMotive(sim.motives.hunger + 30 / 8);
      break;
    }
    case 'eat_meal': {
      const quality = (obj.data.quality as number) ?? 0;
      const spoiled = world.totalMinutes > ((obj.data.freshUntil as number) ?? Infinity);
      const total = spoiled ? 25 : 55 + quality * 3;
      sim.motives.hunger = clampMotive(sim.motives.hunger + total / Math.max(1, inter.duration));
      break;
    }
    case 'eat_pizza': {
      sim.motives.hunger = clampMotive(sim.motives.hunger + 45 / Math.max(1, inter.duration));
      break;
    }
    case 'swim': {
      sim.motives.fun = clampMotive(sim.motives.fun + 0.5);
      sim.motives.hygiene = clampMotive(sim.motives.hygiene + 0.2);
      sim.motives.energy = clampMotive(sim.motives.energy - 0.3);
      gainSkill(sim, 'body', 0.6, 1);
      if (sim.motives.energy < 15) {
        finishAction(world, sim, true);
        return;
      }
      break;
    }
    case 'paint': {
      obj.data.progress = ((obj.data.progress as number) ?? 0) + 1;
      break;
    }
    default:
      break;
  }

  // Exit-when-full loops (TV, sofas, sleep handled above).
  if (inter.exitWhenFull && sim.motives[inter.exitWhenFull] >= 96) {
    finishAction(world, sim, true);
    return;
  }

  action.ticksLeft -= 1;
  if (action.ticksLeft <= 0) finishAction(world, sim, true);
}

// ─── Finishing ──────────────────────────────────────────────────────────────

export function finishAction(world: World, sim: Sim, completed: boolean): void {
  const action = sim.action;
  if (!action) return;
  const lot = sim.lotId ? world.lots[sim.lotId] : null;

  if (completed && lot && action.kind === 'object') {
    const obj = lot.objects[action.objectId!];
    const inter = obj
      ? getDef(obj.defId).interactions.find((i) => i.id === action.interactionId)
      : undefined;
    if (obj && inter) onFinishHandler(world, sim, lot, obj, inter);
  }

  releaseClaims(world, sim);
  if (sim.asleep) sim.asleep = false;
  sim.action = null;
  sim.path = null;
}

function onFinishHandler(
  world: World,
  sim: Sim,
  lot: Lot,
  obj: WorldObject,
  inter: ObjectInteraction
): void {
  const def = getDef(obj.defId);
  obj.uses += 1;

  // Wear & tear — cheap objects fail young.
  if (
    def.breakable &&
    !obj.broken &&
    !world.cheats.unbreakable &&
    chance(world, 1 / (def.mtbf ?? 60))
  ) {
    obj.broken = true;
    logMsg(world, '🔩', `The ${def.name} broke.`);
    if (def.category === 'plumbing') {
      spawnProp(world, lot, 'puddle', obj.x + 1 <= lot.w - 1 ? obj.x + 1 : obj.x - 1, obj.y);
    }
  }

  switch (inter.special) {
    case 'sleep': {
      sim.asleep = false;
      obj.dirty = true; // unmade bed
      break;
    }
    case 'use_toilet': {
      sim.motives.hygiene = clampMotive(sim.motives.hygiene + 4);
      if (obj.uses % (sim.personality.neat < 4 ? 3 : 5) === 0) obj.dirty = true;
      break;
    }
    case 'shower': {
      if (obj.uses % 5 === 0) obj.dirty = true;
      if (sim.personality.neat < 3 && chance(world, 0.4)) {
        spawnProp(world, lot, 'puddle', sim.pos.x, sim.pos.y);
      }
      break;
    }
    case 'repair': {
      obj.broken = false;
      gainSkill(sim, 'mechanical', 1.2, inter.duration);
      logMsg(world, '🔧', `${sim.name} repaired the ${def.name}.`);
      break;
    }
    case 'clean': {
      obj.dirty = false;
      break;
    }
    case 'clean_mess': {
      removeObject(lot, obj.id);
      break;
    }
    case 'eat_meal': {
      removeObject(lot, obj.id);
      spawnProp(world, lot, 'plate_dirty', obj.x, obj.y);
      break;
    }
    case 'eat_pizza': {
      const slices = ((obj.data.slices as number) ?? 8) - 2;
      obj.data.slices = slices;
      if (slices <= 0) {
        removeObject(lot, obj.id);
        spawnProp(world, lot, 'trash_pile', obj.x, obj.y);
      }
      break;
    }
    case 'swim': {
      // Climbing out requires the ladder to still exist. If it's gone, the
      // engine's drowning check takes over. Dark, famous, faithful.
      const ladder = findObjects(lot, 'pool_ladder')[0];
      if (ladder) {
        sim.pos = { x: ladder.x, y: ladder.y };
        sim.swimming = false;
      }
      break;
    }
    case 'paint': {
      const progress = (obj.data.progress as number) ?? 0;
      if (progress >= 110) {
        obj.data.progress = 0;
        const sale = PAINTING_SALE_BASE + Math.floor(sim.skills.creativity) * 16;
        const hh = household(world, sim);
        if (hh) hh.funds += sale;
        logMsg(world, '🎨', `${sim.name} sold a painting for §${sale}.`);
      }
      break;
    }
    case 'find_job': {
      const currentTrack = sim.career?.trackId;
      const trackIds = Object.keys(CAREER_TRACKS).filter((t) => t !== currentTrack);
      const count = def.id === 'computer' ? 3 : 1;
      const offers: string[] = [];
      const pool = [...trackIds];
      for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = randInt(world, 0, pool.length - 1);
        offers.push(pool.splice(idx, 1)[0]);
      }
      pushDialog(world, {
        kind: 'jobOffer',
        title: def.id === 'computer' ? 'Online Job Listings' : 'Classified Ads',
        body: `Openings today for ${sim.name}:`,
        options: [
          ...offers.map((t) => ({
            id: t,
            label: `${CAREER_TRACKS[t].icon} ${CAREER_TRACKS[t].name} — ${CAREER_TRACKS[t].levels[0].title} (§${CAREER_TRACKS[t].levels[0].salary}/day)`,
          })),
          { id: 'none', label: 'Keep looking' },
        ],
        simId: sim.id,
      });
      break;
    }
    case 'get_mail': {
      const hh = household(world, sim);
      if (hh && hh.bills.length > 0) {
        setThought(world, sim, THOUGHT.money, 30);
        logMsg(world, '📫', `${hh.bills.length} bill(s) waiting. Pay them at the mailbox.`);
      } else {
        logMsg(world, '📫', 'The mailbox is empty. Suspiciously empty.');
      }
      break;
    }
    case 'pay_bills': {
      const hh = household(world, sim);
      if (!hh) break;
      let paid = 0;
      hh.bills.sort((a, b) => a.issuedDay - b.issuedDay);
      while (hh.bills.length > 0 && hh.funds >= hh.bills[0].amount) {
        const bill = hh.bills.shift()!;
        hh.funds -= bill.amount;
        paid += bill.amount;
      }
      if (paid > 0) logMsg(world, '💸', `${sim.name} paid §${paid} in bills.`);
      if (hh.bills.length > 0) logMsg(world, '⚠️', `Not enough for the remaining bills!`);
      break;
    }
    case 'call_maid': {
      lot.maidHired = !lot.maidHired;
      logMsg(world, '🧹', lot.maidHired
        ? 'Maid service hired — daily visits at 10 AM (§60/visit).'
        : 'Maid service cancelled.');
      break;
    }
    case 'call_repair': {
      world.services.push({ role: 'repairman', lotId: lot.id, arriveAt: world.totalMinutes + 30 });
      logMsg(world, '🔧', 'The repairman is on his way.');
      break;
    }
    case 'call_pizza': {
      const hh = household(world, sim);
      if (hh && hh.funds >= PIZZA_COST) {
        world.services.push({ role: 'pizza', lotId: lot.id, arriveAt: world.totalMinutes + 30 });
        logMsg(world, '🍕', 'Pizza ordered. The countdown begins.');
      } else {
        logMsg(world, '🍕', 'Not enough § for pizza. A dark day.');
      }
      break;
    }
    case 'call_police': {
      const burglarHere = Object.values(world.sims).some(
        (s) => s.npc === 'burglar' && s.lotId === lot.id
      );
      if (burglarHere) {
        world.services.push({ role: 'police', lotId: lot.id, arriveAt: world.totalMinutes + 10 });
        logMsg(world, '🚓', 'Police dispatched!');
      } else {
        logMsg(world, '🚓', 'The dispatcher sighs. There is no burglar.');
      }
      break;
    }
    case 'call_fire': {
      const anyFire = lot.tiles.some((t) => t.fire > 0);
      if (anyFire) {
        world.services.push({ role: 'firefighter', lotId: lot.id, arriveAt: world.totalMinutes + 12 });
        logMsg(world, '🚒', 'Fire department dispatched!');
      } else {
        logMsg(world, '🚒', 'False alarm. The fire chief is unamused.');
      }
      break;
    }
    case 'invite': {
      const known = Object.values(world.sims)
        .filter((s) => !s.dead && !s.npc && s.householdId !== sim.householdId && !s.ghost && s.age === 'adult')
        .sort((a, b) => (sim.relationships[b.id]?.daily ?? 0) - (sim.relationships[a.id]?.daily ?? 0));
      const guest = known[0];
      if (guest) {
        world.services.push({
          role: 'visitor', lotId: lot.id,
          arriveAt: world.totalMinutes + 30, data: { simId: guest.id },
        });
        logMsg(world, '🏠', `${guest.name} is coming over.`);
      }
      break;
    }
    case 'party': {
      const guests = Object.values(world.sims)
        .filter((s) => !s.dead && !s.npc && !s.ghost && s.householdId !== sim.householdId && s.age === 'adult')
        .slice(0, 5);
      for (const g of guests) {
        world.services.push({
          role: 'party_guest', lotId: lot.id,
          arriveAt: world.totalMinutes + 45 + randInt(world, 0, 45), data: { simId: g.id },
        });
      }
      logMsg(world, '🎈', `Party tonight! ${guests.length} invitations went out.`);
      break;
    }
    case 'feed_baby':
    case 'play_baby':
    case 'sing_baby': {
      const baby = world.sims[obj.data.babyId as string];
      if (!baby) break;
      if (inter.special === 'feed_baby') {
        baby.motives.hunger = clampMotive(baby.motives.hunger + 70);
        baby.hungerCrisis = 0;
      }
      if (inter.special === 'play_baby') {
        baby.motives.social = clampMotive(baby.motives.social + 50);
        baby.motives.fun = clampMotive(baby.motives.fun + 40);
      }
      if (inter.special === 'sing_baby') {
        baby.asleep = true;
        baby.motives.energy = clampMotive(baby.motives.energy + 30);
      }
      baby.thought = null;
      break;
    }
    default:
      break;
  }
}

export { pick };
