/**
 * The heartbeat: one call = one sim-minute. Order matters —
 * time → schedules → services/NPCs → fire → per-sim (decay, career, action,
 * free will, failure states) → babies, ghosts, thought upkeep.
 * Only the active lot simulates; the neighborhood is a museum.
 */

import type { Lot, Sim, World } from './types';
import { clampMotive } from './types';
import { computeMood, decayMotives, setThought, worstMotive } from './sim';
import { roomScoreAt, findObjects } from './grid';
import { autonomyChoose } from './ai';
import { tickSimAction, interruptAction } from './interactions';
import { tickSocialStage, dailyRelationshipDecay } from './social';
import { careerTick } from './career';
import {
  fireTick,
  npcTick,
  processServices,
  scheduleTick,
  visitorTick,
} from './services';
import { ghostTick, kill, nightlyGhosts } from './death';
import { spawnProp, tileAt } from './grid';
import { activeLot } from './world';
import { logMsg } from './log';
import { THOUGHT } from '../data/names';
import {
  BABY_MINUTES,
  BABY_NEGLECT_MINUTES,
  BLADDER_FAIL,
  DROWN_ENERGY,
  ENERGY_COLLAPSE,
  FIRE_DEATH_MINUTES,
  HUNGER_CRISIS,
  STARVE_MINUTES,
} from '../data/tuning';

export function minuteTick(world: World): void {
  world.totalMinutes += 1;
  world.minute += 1;
  if (world.minute >= 1440) {
    world.minute = 0;
    world.day += 1;
    dailyRelationshipDecay(world);
  }

  scheduleTick(world);
  processServices(world);

  const lot = activeLot(world);
  if (lot) fireTick(world, lot);
  if (world.minute === 60) nightlyGhosts(world);

  for (const simId of Object.keys(world.sims)) {
    const sim = world.sims[simId];
    if (!sim || sim.dead) continue;

    if (sim.ghost) {
      if (sim.lotId) ghostTick(world, sim);
      continue;
    }
    if (sim.npc) {
      npcTick(world, sim);
      continue;
    }
    // Frozen neighborhood: only the active lot's population simulates.
    if (sim.lotId !== world.activeLotId || !lot) continue;

    if (sim.age === 'baby') {
      babyTick(world, sim, lot);
      continue;
    }

    careerTick(world, sim);
    if (sim.career?.atWork) {
      decayMotives(sim, 1);
      sim.mood = computeMood(sim.motives);
      continue;
    }

    decayMotives(sim, 1);

    // Environment seeps in (Room is read from the world, not decayed).
    if (world.totalMinutes % 3 === 0) {
      const target = roomScoreAt(lot, sim.pos.x, sim.pos.y);
      sim.motives.room = clampMotive(
        sim.motives.room + (target - sim.motives.room) * 0.35
      );
    }

    if (sim.visitLeaveAt !== undefined) visitorTick(world, sim);

    failureChecks(world, sim, lot);
    if (sim.dead) continue;

    if (sim.passedOut) {
      sim.motives.energy = clampMotive(sim.motives.energy + 0.12);
      if (sim.motives.energy > -20) {
        sim.passedOut = false;
        sim.asleep = false;
      }
      sim.mood = computeMood(sim.motives);
      continue;
    }

    if (sim.action?.stage === 'social') tickSocialStage(world, sim);
    else tickSimAction(world, sim);

    if (!sim.action && sim.queue.length === 0 && !sim.asleep) {
      autonomyChoose(world, sim);
    }

    sim.mood = computeMood(sim.motives);
    if (sim.thought && world.totalMinutes > sim.thought.until) sim.thought = null;
    // Distress bubbles: the sim tells you what hurts.
    if (!sim.thought && world.totalMinutes % 10 === 0) {
      const worst = worstMotive(sim);
      if (sim.motives[worst] < -60) setThought(world, sim, THOUGHT[worst], 8);
    }
  }
}

// ─── Failure states ─────────────────────────────────────────────────────────

function failureChecks(world: World, sim: Sim, lot: Lot): void {
  // Bladder: -100 has exactly the consequence everyone fears.
  if (sim.motives.bladder <= BLADDER_FAIL) {
    sim.motives.bladder = 100;
    sim.motives.hygiene = clampMotive(sim.motives.hygiene - 40);
    sim.motives.fun = clampMotive(sim.motives.fun - 20);
    spawnProp(world, lot, 'puddle', sim.pos.x, sim.pos.y);
    setThought(world, sim, '😳', 45);
    logMsg(world, '💧', `${sim.name} had an accident. The floor remembers.`);
  }

  // Energy: collapse where standing.
  if (
    sim.motives.energy <= ENERGY_COLLAPSE &&
    !sim.asleep &&
    !sim.passedOut &&
    !sim.swimming
  ) {
    interruptAction(world, sim);
    sim.queue = [];
    sim.passedOut = true;
    sim.asleep = true;
    sim.motives.hygiene = clampMotive(sim.motives.hygiene - 10);
    setThought(world, sim, THOUGHT.energy, 90);
    logMsg(world, '😵', `${sim.name} passed out cold on the floor.`);
  }

  // Hunger: the starvation clock.
  if (sim.motives.hunger <= HUNGER_CRISIS) {
    sim.hungerCrisis += 1;
    if (sim.hungerCrisis === 1) {
      logMsg(world, '🍔', `${sim.name} is STARVING. This is not a drill.`);
      setThought(world, sim, THOUGHT.hunger, 120);
    }
    if (sim.hungerCrisis >= STARVE_MINUTES) {
      kill(world, sim, 'starvation');
      return;
    }
  } else if (sim.hungerCrisis > 0) {
    sim.hungerCrisis = 0;
  }

  // Fire: standing in flames is briefly survivable.
  const t = tileAt(lot, sim.pos.x, sim.pos.y);
  if (t && t.fire > 0) {
    sim.fireMinutes += 1;
    sim.motives.comfort = clampMotive(sim.motives.comfort - 20);
    if (sim.fireMinutes >= FIRE_DEATH_MINUTES) {
      kill(world, sim, 'fire');
      return;
    }
  } else {
    sim.fireMinutes = 0;
  }

  // Swimming: no ladder, no exit. The most famous mechanic in the genre.
  if (sim.swimming) {
    const ladder = findObjects(lot, 'pool_ladder')[0];
    if (!sim.action) {
      if (ladder) {
        sim.pos = { x: ladder.x, y: ladder.y };
        sim.swimming = false;
      } else {
        sim.motives.energy = clampMotive(sim.motives.energy - 0.5);
        setThought(world, sim, '🪜', 5);
      }
    }
    if (!ladder && sim.motives.energy <= DROWN_ENERGY) {
      kill(world, sim, 'drowning');
    }
  }
}

// ─── Babies ─────────────────────────────────────────────────────────────────

function babyTick(world: World, baby: Sim, lot: Lot): void {
  if (baby.asleep) {
    baby.motives.energy = clampMotive(baby.motives.energy + 0.2);
    if (baby.motives.energy >= 95) baby.asleep = false;
  } else {
    baby.motives.energy = clampMotive(baby.motives.energy - 0.04);
  }
  baby.motives.hunger = clampMotive(baby.motives.hunger - 0.07);
  baby.motives.social = clampMotive(baby.motives.social - 0.05);
  baby.motives.fun = clampMotive(baby.motives.fun - 0.03);
  baby.mood = computeMood(baby.motives);

  // Crying is a broadcast medium.
  if (!baby.asleep && (baby.motives.hunger < -40 || baby.motives.social < -40)) {
    if (!baby.thought) setThought(world, baby, '😭', 15);
  }

  // Neglect has a visitor with a clipboard.
  if (baby.motives.hunger <= -90) {
    baby.hungerCrisis += 1;
    if (
      baby.hungerCrisis >= BABY_NEGLECT_MINUTES &&
      !world.services.some((s) => s.role === 'social_worker') &&
      !Object.values(world.sims).some((s) => s.npc === 'social_worker')
    ) {
      world.services.push({
        role: 'social_worker',
        lotId: lot.id,
        arriveAt: world.totalMinutes + 15,
      });
      logMsg(world, '🚨', 'Someone reported the crying. Social services are coming.');
    }
  } else if (baby.hungerCrisis > 0 && baby.motives.hunger > -50) {
    baby.hungerCrisis = 0;
  }

  // Growing up (3 days of scream-feed-play).
  if (world.totalMinutes - baby.bornAt >= BABY_MINUTES) {
    baby.age = 'child';
    baby.motives.hunger = 50;
    baby.motives.energy = 60;
    for (const crib of findObjects(lot, 'crib')) {
      if (crib.data.babyId === baby.id) {
        crib.data.babyId = undefined;
        baby.pos = { x: crib.x, y: Math.min(lot.h - 1, crib.y + 1) };
      }
    }
    logMsg(world, '🎂', `${baby.name} grew up into a child!`);
  }
}
