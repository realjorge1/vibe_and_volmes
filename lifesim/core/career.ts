/**
 * Careers runtime: carpool honks, shifts, pay, performance, promotions (skill
 * AND friend-count gated — the social treadmill), chance cards, and school
 * for children. The artist's own occupation is the music career (bridge);
 * these tracks employ everyone else.
 */

import type { Sim, World } from './types';
import { weekday } from './types';
import { CAREER_TRACKS, CHANCE_CARDS } from '../data/careers';
import {
  CARPOOL_LEAD_MINUTES,
  MISSED_DAYS_FIRED,
} from '../data/tuning';
import { chance, pick } from './rng';
import { logMsg, pushDialog } from './log';
import { THOUGHT } from '../data/names';
import { setThought } from './sim';
import { householdFriendCount } from './social';
import { interruptAction } from './interactions';

function isWorkday(sim: Sim, world: World): boolean {
  if (!sim.career) return false;
  const track = CAREER_TRACKS[sim.career.trackId];
  const level = track.levels[sim.career.level];
  return level.days.includes(weekday(world.day));
}

/** Called each sim-minute for resident sims on the active lot. */
export function careerTick(world: World, sim: Sim): void {
  if (sim.age === 'child') {
    schoolTick(world, sim);
    return;
  }
  if (!sim.career) return;
  const track = CAREER_TRACKS[sim.career.trackId];
  const level = track.levels[sim.career.level];
  const overnight = level.end < level.start;

  if (!sim.career.atWork) {
    if (!isWorkday(sim, world)) return;
    // Carpool honks an hour early. It waits. It judges.
    if (world.minute === level.start - CARPOOL_LEAD_MINUTES) {
      logMsg(world, '🚗', `The carpool is here for ${sim.name} (${level.title}).`);
      setThought(world, sim, THOUGHT.work, CARPOOL_LEAD_MINUTES);
    }
    // Free-willed sims board 15 minutes before the shift; a paused slider
    // means the player must send them (departForWork).
    if (world.minute === level.start - 15 && world.autonomy > 0 && !sim.asleep) {
      departForWork(world, sim);
      return;
    }
    if (world.minute === level.start) {
      sim.career.missedDays += 1;
      if (sim.career.missedDays >= MISSED_DAYS_FIRED) {
        logMsg(world, '💼', `${sim.name} was FIRED from ${track.name}.`);
        sim.career = null;
        setThought(world, sim, THOUGHT.angry, 120);
      } else {
        logMsg(world, '🚗', `${sim.name} missed the carpool. One more and they're fired.`);
        sim.career.performance -= 15;
      }
    }
    return;
  }

  // At work: chance cards strike mid-shift for playable household sims.
  const midShift = overnight
    ? world.minute === (level.start + 180) % 1440
    : world.minute === Math.floor((level.start + level.end) / 2);
  if (midShift && sim.householdId && chance(world, 0.15) &&
    !world.dialogs.some((d) => d.kind === 'chanceCard')) {
    const card = pick(world, CHANCE_CARDS);
    pushDialog(world, {
      kind: 'chanceCard',
      title: `At Work: ${sim.name}`,
      body: card.text,
      options: [
        { id: 'risk', label: card.riskLabel },
        { id: 'safe', label: card.safeLabel },
      ],
      simId: sim.id,
      data: { cardId: card.id },
    });
  }

  if (world.minute === level.end) returnFromWork(world, sim);
}

export function departForWork(world: World, sim: Sim): void {
  if (!sim.career || sim.career.atWork) return;
  interruptAction(world, sim);
  sim.queue = [];
  sim.career.atWork = true;
  sim.asleep = false;
  logMsg(world, '🚗', `${sim.name} left for work.`);
}

function returnFromWork(world: World, sim: Sim): void {
  const career = sim.career!;
  const track = CAREER_TRACKS[career.trackId];
  const level = track.levels[career.level];
  career.atWork = false;
  career.missedDays = 0;
  career.daysWorked += 1;

  const hh = sim.householdId ? world.households[sim.householdId] : null;
  if (hh) hh.funds += level.salary;
  logMsg(world, '💼', `${sim.name} came home: +§${level.salary}.`);

  // Performance follows the mood they carried through the shift.
  career.performance = Math.max(
    -100,
    Math.min(100, career.performance + (sim.mood >= 20 ? 6 : sim.mood >= -20 ? 2 : -8))
  );
  // A day's work is tiring and grubby.
  sim.motives.energy = Math.max(-100, sim.motives.energy - 15);
  sim.motives.hygiene = Math.max(-100, sim.motives.hygiene - 10);
  sim.motives.hunger = Math.max(-100, sim.motives.hunger - 10);

  if (career.performance <= -60 && career.level > 0) {
    career.level -= 1;
    career.performance = 0;
    logMsg(world, '📉', `${sim.name} was demoted to ${track.levels[career.level].title}.`);
    return;
  }

  if (career.performance >= 50 && career.level < track.levels.length - 1) {
    const next = track.levels[career.level + 1];
    const skillsMet = Object.entries(next.skills).every(
      ([skill, req]) => sim.skills[skill as keyof Sim['skills']] >= (req ?? 0)
    );
    const friendsMet =
      !sim.householdId ||
      householdFriendCount(world, sim.householdId) >= next.friends;
    if (skillsMet && friendsMet) {
      career.level += 1;
      career.performance = 0;
      if (hh) hh.funds += next.salary; // promotion bonus: one shift's pay
      logMsg(world, '🎉', `PROMOTION! ${sim.name} is now ${next.title} (§${next.salary}/day, +§${next.salary} bonus).`);
      setThought(world, sim, THOUGHT.happy, 120);
    } else if (!skillsMet) {
      logMsg(world, '📖', `${sim.name} needs more skills to reach ${next.title}.`);
    } else {
      logMsg(world, '👥', `${sim.name} needs ${next.friends} family friends to reach ${next.title}.`);
    }
  }
}

/** Store-level resolver for chance cards. */
export function resolveChanceCard(
  world: World,
  simId: string,
  cardId: string,
  risky: boolean
): string {
  const sim = world.sims[simId];
  const card = CHANCE_CARDS.find((c) => c.id === cardId);
  if (!sim || !card || !sim.career) return 'The moment passes.';
  const track = CAREER_TRACKS[sim.career.trackId];
  const salary = track.levels[sim.career.level].salary;
  if (!risky) {
    sim.career.performance += 1;
    return 'You play it safe. The day proceeds without incident.';
  }
  const skill = sim.skills[card.skill];
  const success = chance(world, Math.min(0.9, 0.35 + skill * 0.05));
  const hh = sim.householdId ? world.households[sim.householdId] : null;
  if (success) {
    const pay = Math.round(salary * card.goodPay);
    if (hh) hh.funds += pay;
    sim.career.performance += 12;
    logMsg(world, '🎲', `${sim.name}: ${card.goodText} (+§${pay})`);
    return `${card.goodText} (+§${pay})`;
  }
  const loss = Math.round(salary * -card.badPay);
  if (hh) hh.funds = Math.max(0, hh.funds - loss);
  sim.career.performance -= 15;
  logMsg(world, '🎲', `${sim.name}: ${card.badText} (-§${loss})`);
  return `${card.badText} (-§${loss})`;
}

/** Store-level resolver for job offers. */
export function acceptJob(world: World, simId: string, trackId: string): void {
  const sim = world.sims[simId];
  if (!sim || !CAREER_TRACKS[trackId]) return;
  sim.career = {
    trackId,
    level: 0,
    performance: 0,
    missedDays: 0,
    atWork: false,
    daysWorked: 0,
  };
  const level = CAREER_TRACKS[trackId].levels[0];
  logMsg(world, '💼', `${sim.name} took a job: ${level.title} (§${level.salary}/day).`);
}

// ─── School ─────────────────────────────────────────────────────────────────

function schoolTick(world: World, sim: Sim): void {
  const wd = weekday(world.day);
  if (wd > 5) return;
  const atSchool = !!sim.career?.atWork; // reuse the atWork flag for school
  if (!atSchool) {
    if (world.minute === 8 * 60 - 20) {
      logMsg(world, '🚌', `The school bus is coming for ${sim.name}.`);
      setThought(world, sim, THOUGHT.school, 20);
    }
    if (world.minute === 8 * 60) {
      interruptAction(world, sim);
      sim.queue = [];
      sim.asleep = false;
      if (!sim.career) {
        sim.career = { trackId: 'school', level: 0, performance: 0, missedDays: 0, atWork: false, daysWorked: 0 };
      }
      sim.career.atWork = true;
      // Grades ride on the state they left in.
      sim.grade = Math.max(0, Math.min(100, sim.grade + (sim.mood >= 0 ? 2 : -4)));
    }
    return;
  }
  if (world.minute === 15 * 60) {
    sim.career!.atWork = false;
    sim.motives.energy = Math.max(-100, sim.motives.energy - 10);
    sim.motives.fun = Math.max(-100, sim.motives.fun - 10);
    if (sim.grade < 25) {
      logMsg(world, '📉', `${sim.name} is failing school. Mood before the bus matters!`);
    } else if (sim.grade > 90 && chance(world, 0.2)) {
      const hh = sim.householdId ? world.households[sim.householdId] : null;
      if (hh) {
        hh.funds += 100;
        logMsg(world, '🎒', `${sim.name} aced a test — a relative mailed §100.`);
      }
    }
  }
}
