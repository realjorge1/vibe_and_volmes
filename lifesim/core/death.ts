/**
 * Death & consequences: starvation, electrocution, fire, drowning — then the
 * robed Reaper (public-domain folklore, dry sense of humor), a plead window,
 * urns, and nightly hauntings. Failure is content; never soften it.
 */

import type { Sim, World } from './types';
import { clampMotive, newId, MOTIVE_IDS } from './types';
import { spawnProp, findObjects, removeObject } from './grid';
import { chance, pick } from './rng';
import { logMsg, pushDialog } from './log';
import { NPC_NAMES, THOUGHT } from '../data/names';
import { PLEAD_SUCCESS } from '../data/tuning';
import { createSim, setThought } from './sim';

export type DeathCause = 'starvation' | 'electrocution' | 'fire' | 'drowning';

const EPITAPHS: Record<DeathCause, string> = {
  starvation: 'died within arm’s reach of a fridge',
  electrocution: 'repaired their last appliance',
  fire: 'stood too close to dinner',
  drowning: 'searched for a ladder that was not there',
};

/** Shock from a botched repair; lethal only if the sim was already wrecked. */
export function electrocute(world: World, sim: Sim): void {
  for (const m of MOTIVE_IDS) {
    if (m === 'room') continue;
    sim.motives[m] = clampMotive(sim.motives[m] - 30);
  }
  const wrecked = MOTIVE_IDS.filter((m) => m !== 'room' && sim.motives[m] < -50).length;
  logMsg(world, '⚡', `${sim.name} was electrocuted!`);
  if (wrecked >= 3) {
    kill(world, sim, 'electrocution');
  } else {
    sim.passedOut = true;
    setThought(world, sim, '⚡', 45);
    const lot = sim.lotId ? world.lots[sim.lotId] : null;
    if (lot) spawnProp(world, lot, 'ash_pile', sim.pos.x, sim.pos.y);
  }
}

export function kill(world: World, sim: Sim, cause: DeathCause): void {
  if (sim.dead) return;
  sim.dead = true;
  sim.asleep = false;
  sim.swimming = cause === 'drowning' ? true : sim.swimming;
  sim.action = null;
  sim.queue = [];
  sim.path = null;
  logMsg(world, THOUGHT.death, `${sim.name} ${EPITAPHS[cause]}.`);

  // Everyone present grieves — and the Reaper is dispatched.
  for (const otherId in world.sims) {
    const other = world.sims[otherId];
    if (other.id === sim.id || other.dead || other.lotId !== sim.lotId) continue;
    other.motives.fun = clampMotive(other.motives.fun - 25);
    other.motives.social = clampMotive(other.motives.social - 15);
    setThought(world, other, THOUGHT.death, 90);
  }
  if (sim.lotId) {
    world.services.push({
      role: 'reaper',
      lotId: sim.lotId,
      arriveAt: world.totalMinutes + 5,
      data: { simId: sim.id },
    });
  } else {
    finalizeDeath(world, sim);
  }
}

/** The Reaper NPC script: walk to the departed, ceremony, plead window, urn. */
export function reaperTick(world: World, reaper: Sim): void {
  const lot = reaper.lotId ? world.lots[reaper.lotId] : null;
  const targetId = reaper.action?.data?.deceasedId as string | undefined;
  const target = targetId ? world.sims[targetId] : null;
  if (!lot || !target) {
    despawnNpc(world, reaper);
    return;
  }
  const d = Math.abs(reaper.pos.x - target.pos.x) + Math.abs(reaper.pos.y - target.pos.y);
  if (d > 1) {
    // March, unhurried. Death is never late; everyone else is simply early.
    const dx = Math.sign(target.pos.x - reaper.pos.x);
    const dy = Math.sign(target.pos.y - reaper.pos.y);
    reaper.pos = {
      x: Math.max(0, Math.min(lot.w - 1, reaper.pos.x + dx)),
      y: Math.max(0, Math.min(lot.h - 1, reaper.pos.y + (dx === 0 ? dy : 0))),
    };
    return;
  }

  const ceremony = ((reaper.action!.data.ceremony as number) ?? 0) + 1;
  reaper.action!.data.ceremony = ceremony;

  // One chance: a household adult standing nearby may plead for the soul.
  if (ceremony === 3 && !reaper.action!.data.pleadOffered) {
    reaper.action!.data.pleadOffered = true;
    const pleader = Object.values(world.sims).find(
      (s) =>
        !s.dead && !s.npc && s.age === 'adult' &&
        s.householdId === target.householdId && s.lotId === lot.id &&
        Math.abs(s.pos.x - target.pos.x) + Math.abs(s.pos.y - target.pos.y) <= 4
    );
    if (pleader && !world.dialogs.some((dd) => dd.kind === 'plead')) {
      pushDialog(world, {
        kind: 'plead',
        title: 'The Reaper Pauses',
        body: `${pleader.name} may plead for ${target.name}'s life. The Reaper appears… persuadable. Slightly.`,
        options: [
          { id: 'plead', label: 'Plead for their life' },
          { id: 'accept', label: 'Let them go' },
        ],
        simId: pleader.id,
        data: { deceasedId: target.id, reaperId: reaper.id },
      });
      return;
    }
  }

  // Hold while the plead dialog is open.
  if (world.dialogs.some((dd) => dd.kind === 'plead')) return;

  if (ceremony >= 10) {
    finalizeDeath(world, target);
    despawnNpc(world, reaper);
  }
}

/** Store-level resolver for the plead dialog. */
export function resolvePlead(world: World, deceasedId: string, pleaded: boolean): void {
  const sim = world.sims[deceasedId];
  if (!sim) return;
  if (pleaded && chance(world, PLEAD_SUCCESS)) {
    sim.dead = false;
    for (const m of MOTIVE_IDS) {
      if (m === 'room') continue;
      sim.motives[m] = Math.max(sim.motives[m], -40);
    }
    sim.hungerCrisis = 0;
    logMsg(world, '✨', `The Reaper shrugs and hands ${sim.name} back. "Paperwork," he mutters.`);
    // Send the reaper home satisfied.
    for (const id in world.sims) {
      const s = world.sims[id];
      if (s.npc === 'reaper' && s.lotId === sim.lotId) despawnNpc(world, s);
    }
  } else if (pleaded) {
    logMsg(world, THOUGHT.death, 'The plea was heard, considered, and filed under NO.');
  }
}

export function finalizeDeath(world: World, sim: Sim): void {
  if (!sim.dead) return;
  const lot = sim.lotId ? world.lots[sim.lotId] : null;
  if (lot) {
    const urn = spawnProp(world, lot, 'urn', sim.pos.x, sim.pos.y);
    urn.data.simId = sim.id;
    urn.data.simName = sim.name;
  }
  if (sim.householdId) {
    const hh = world.households[sim.householdId];
    if (hh) hh.simIds = hh.simIds.filter((id) => id !== sim.id);
  }
  sim.ghost = true;
  sim.lotId = null; // the urn anchors the haunting
}

/** Nightly hauntings: each urn may wake its ghost between 1–4 AM. */
export function nightlyGhosts(world: World): void {
  const lot = world.activeLotId ? world.lots[world.activeLotId] : null;
  if (!lot) return;
  const hour = Math.floor(world.minute / 60);
  if (hour !== 1) return;
  for (const urn of findObjects(lot, 'urn')) {
    const ghost = urn.data.simId ? world.sims[urn.data.simId as string] : null;
    if (!ghost || !ghost.ghost || ghost.lotId !== null) continue;
    if (!chance(world, 0.2)) continue;
    ghost.lotId = lot.id;
    ghost.pos = { x: urn.x, y: urn.y };
    ghost.visitLeaveAt = world.totalMinutes + 180;
    logMsg(world, THOUGHT.ghost, `${ghost.name} rises to haunt the living.`);
  }
}

/** Per-minute ghost behavior: drift, moan, terrify. */
export function ghostTick(world: World, ghost: Sim): void {
  const lot = ghost.lotId ? world.lots[ghost.lotId] : null;
  if (!lot) return;
  if (
    ghost.visitLeaveAt !== undefined &&
    world.totalMinutes >= ghost.visitLeaveAt
  ) {
    ghost.lotId = null;
    return;
  }
  if (chance(world, 0.3)) {
    const dx = pick(world, [-1, 0, 1]);
    const dy = pick(world, [-1, 0, 1]);
    ghost.pos = {
      x: Math.max(0, Math.min(lot.w - 1, ghost.pos.x + dx)),
      y: Math.max(0, Math.min(lot.h - 1, ghost.pos.y + dy)),
    };
  }
  for (const id in world.sims) {
    const mortal = world.sims[id];
    if (mortal.dead || mortal.ghost || mortal.lotId !== lot.id || mortal.asleep) continue;
    const d = Math.abs(mortal.pos.x - ghost.pos.x) + Math.abs(mortal.pos.y - ghost.pos.y);
    if (d <= 2) {
      mortal.motives.fun = clampMotive(mortal.motives.fun - 3);
      mortal.motives.room = clampMotive(mortal.motives.room - 5);
      setThought(world, mortal, THOUGHT.ghost, 20);
    }
  }
}

// ─── NPC lifecycle helpers (shared with services) ───────────────────────────

export function spawnNpc(
  world: World,
  role: NonNullable<Sim['npc']>,
  lotId: string,
  data: Record<string, unknown> = {}
): Sim {
  const lot = world.lots[lotId];
  const npc = createSim(world, { name: NPC_NAMES[role] ?? role, npc: role });
  npc.lotId = lotId;
  npc.pos = { ...lot.spawn };
  npc.action = {
    id: newId(world, 'act'),
    kind: 'system',
    label: role,
    icon: '🚶',
    stage: 'script',
    ticksLeft: 0,
    data: { ...data, deceasedId: data.simId },
  };
  return npc;
}

export function despawnNpc(world: World, npc: Sim): void {
  delete world.sims[npc.id];
}
