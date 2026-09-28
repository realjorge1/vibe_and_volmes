/**
 * Sim fundamentals: motive decay, mood aggregation, personality, zodiac,
 * skill gain, and random sim generation (personality points — no visual CAS,
 * per scope).
 */

import {
  type Motives,
  type MotiveId,
  type Personality,
  type Sim,
  type SkillId,
  type World,
  MOTIVE_IDS,
  clampMotive,
  newId,
} from './types';
import {
  ASLEEP_DECAY,
  DECAY,
  MOOD_DIVISOR,
  MOOD_PAIN_MULT,
  MOOD_WEIGHTS,
  SKILL_HOURS_PER_LEVEL,
  WORK_DECAY_MULT,
} from '../data/tuning';
import { rand, randInt, pick } from './rng';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';

// ─── Motives & mood ─────────────────────────────────────────────────────────

export function freshMotives(): Motives {
  return {
    hunger: 70, comfort: 70, hygiene: 70, bladder: 70,
    energy: 80, fun: 60, social: 50, room: 0,
  };
}

/** One sim-minute of baseline decay (interactions add their own effects). */
export function decayMotives(sim: Sim, minutes: number): void {
  const perHour = minutes / 60;
  const offLot = sim.career?.atWork ? WORK_DECAY_MULT : 1;
  for (const m of MOTIVE_IDS) {
    if (m === 'room') continue;
    let rate = DECAY[m];
    if (sim.asleep && ASLEEP_DECAY[m] !== undefined) rate = ASLEEP_DECAY[m]!;
    if (m === 'comfort' && (sim.asleep || sim.action?.data?.sitting)) rate = 0;
    if (m === 'energy') {
      if (sim.asleep) continue; // beds add energy via effects
      rate = Math.max(1.5, rate - sim.personality.active * 0.15);
    }
    if (m === 'fun') rate = rate + sim.personality.playful * 0.35;
    if (m === 'social') rate = rate + sim.personality.outgoing * 0.3;
    sim.motives[m] = clampMotive(sim.motives[m] - rate * perHour * offLot);
  }
}

/** Low motives hurt disproportionately — this asymmetry IS the game feel. */
export function computeMood(m: Motives): number {
  let total = 0;
  for (const id of MOTIVE_IDS) {
    const v = m[id];
    const w = MOOD_WEIGHTS[id];
    total += v < 0 ? v * w * MOOD_PAIN_MULT : v * w;
  }
  return Math.max(-100, Math.min(100, total / MOOD_DIVISOR));
}

export function worstMotive(sim: Sim): MotiveId {
  let worst: MotiveId = 'hunger';
  for (const id of MOTIVE_IDS) {
    if (sim.motives[id] < sim.motives[worst]) worst = id;
  }
  return worst;
}

// ─── Skills ─────────────────────────────────────────────────────────────────

/** perHour points scaled by personality affinity; returns true on level-up. */
export function gainSkill(sim: Sim, id: SkillId, perHour: number, minutes: number): boolean {
  if (sim.mood < -60) return false; // miserable sims learn nothing
  let mult = 1;
  if (id === 'body') mult += sim.personality.active * 0.06;
  if (id === 'creativity') mult += sim.personality.playful * 0.06;
  if (id === 'logic') mult += (10 - sim.personality.playful) * 0.04;
  if (id === 'charisma') mult += sim.personality.outgoing * 0.06;
  const before = Math.floor(sim.skills[id]);
  // A "point" of skill display = 1.0; hours needed grow with level.
  const level = sim.skills[id];
  const hoursNeeded = SKILL_HOURS_PER_LEVEL * (Math.floor(level) + 1);
  sim.skills[id] = Math.min(10, level + ((perHour * mult) / hoursNeeded / 60) * minutes);
  return Math.floor(sim.skills[id]) > before;
}

// ─── Personality & zodiac ───────────────────────────────────────────────────

interface ZodiacArchetype {
  sign: string;
  icon: string;
  p: Personality;
  attracted: string[];
  repelled: string[];
}

export const ZODIAC: ZodiacArchetype[] = [
  { sign: 'Aries', icon: '♈', p: { neat: 5, outgoing: 8, active: 6, playful: 7, nice: 2 }, attracted: ['Gemini', 'Taurus'], repelled: ['Cancer', 'Libra'] },
  { sign: 'Taurus', icon: '♉', p: { neat: 5, outgoing: 5, active: 3, playful: 8, nice: 4 }, attracted: ['Aries', 'Libra'], repelled: ['Virgo', 'Cancer'] },
  { sign: 'Gemini', icon: '♊', p: { neat: 4, outgoing: 7, active: 8, playful: 3, nice: 3 }, attracted: ['Pisces', 'Virgo'], repelled: ['Capricorn', 'Aquarius'] },
  { sign: 'Cancer', icon: '♋', p: { neat: 6, outgoing: 3, active: 6, playful: 4, nice: 6 }, attracted: ['Taurus', 'Scorpio'], repelled: ['Gemini', 'Aries'] },
  { sign: 'Leo', icon: '♌', p: { neat: 2, outgoing: 8, active: 4, playful: 6, nice: 5 }, attracted: ['Sagittarius', 'Cancer'], repelled: ['Capricorn', 'Gemini'] },
  { sign: 'Virgo', icon: '♍', p: { neat: 9, outgoing: 2, active: 6, playful: 3, nice: 5 }, attracted: ['Aquarius', 'Sagittarius'], repelled: ['Leo', 'Taurus'] },
  { sign: 'Libra', icon: '♎', p: { neat: 2, outgoing: 8, active: 2, playful: 6, nice: 7 }, attracted: ['Virgo', 'Cancer'], repelled: ['Pisces', 'Scorpio'] },
  { sign: 'Scorpio', icon: '♏', p: { neat: 6, outgoing: 5, active: 8, playful: 3, nice: 1 }, attracted: ['Pisces', 'Leo'], repelled: ['Libra', 'Aquarius'] },
  { sign: 'Sagittarius', icon: '♐', p: { neat: 2, outgoing: 6, active: 9, playful: 7, nice: 4 }, attracted: ['Pisces', 'Capricorn'], repelled: ['Libra', 'Scorpio'] },
  { sign: 'Capricorn', icon: '♑', p: { neat: 7, outgoing: 4, active: 1, playful: 8, nice: 5 }, attracted: ['Aquarius', 'Taurus'], repelled: ['Leo', 'Gemini'] },
  { sign: 'Aquarius', icon: '♒', p: { neat: 4, outgoing: 4, active: 4, playful: 8, nice: 8 }, attracted: ['Capricorn', 'Sagittarius'], repelled: ['Scorpio', 'Virgo'] },
  { sign: 'Pisces', icon: '♓', p: { neat: 5, outgoing: 3, active: 7, playful: 3, nice: 9 }, attracted: ['Scorpio', 'Gemini'], repelled: ['Leo', 'Aries'] },
];

export function deriveZodiac(p: Personality): string {
  let best = ZODIAC[0];
  let bestDist = Infinity;
  for (const z of ZODIAC) {
    const d =
      (p.neat - z.p.neat) ** 2 +
      (p.outgoing - z.p.outgoing) ** 2 +
      (p.active - z.p.active) ** 2 +
      (p.playful - z.p.playful) ** 2 +
      (p.nice - z.p.nice) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }
  return best.sign;
}

/** Chemistry modifier between two signs: +1 attracted, -1 repelled, 0 neutral. */
export function zodiacChemistry(a: string, b: string): number {
  const za = ZODIAC.find((z) => z.sign === a);
  if (!za) return 0;
  if (za.attracted.includes(b)) return 1;
  if (za.repelled.includes(b)) return -1;
  return 0;
}

export function zodiacIcon(sign: string): string {
  return ZODIAC.find((z) => z.sign === sign)?.icon ?? '✨';
}

/** Distribute 25 personality points randomly across the five axes. */
export function randomPersonality(world: World): Personality {
  const p: Personality = { neat: 0, outgoing: 0, active: 0, playful: 0, nice: 0 };
  const keys = Object.keys(p) as (keyof Personality)[];
  let points = 25;
  while (points > 0) {
    const k = pick(world, keys);
    if (p[k] < 10) {
      p[k] += 1;
      points -= 1;
    }
  }
  return p;
}

// ─── Sim creation ───────────────────────────────────────────────────────────

export function createSim(
  world: World,
  opts: {
    name?: string;
    lastName?: string;
    age?: Sim['age'];
    householdId?: string | null;
    npc?: Sim['npc'];
    personality?: Personality;
    outfit?: number;
  } = {}
): Sim {
  const personality = opts.personality ?? randomPersonality(world);
  const first = pick(world, FIRST_NAMES);
  const last = opts.lastName ?? pick(world, LAST_NAMES);
  const sim: Sim = {
    id: newId(world, 'sim'),
    name: opts.name ?? `${first} ${last}`,
    age: opts.age ?? 'adult',
    householdId: opts.householdId ?? null,
    npc: opts.npc,
    lotId: null,
    pos: { x: 0, y: 0 },
    path: null,
    personality,
    zodiac: deriveZodiac(personality),
    motives: freshMotives(),
    mood: 0,
    skills: {
      cooking: randInt(world, 0, 2), mechanical: randInt(world, 0, 2),
      charisma: randInt(world, 0, 2), body: randInt(world, 0, 2),
      logic: randInt(world, 0, 2), creativity: randInt(world, 0, 2),
    },
    relationships: {},
    career: null,
    grade: 75,
    queue: [],
    action: null,
    asleep: false,
    passedOut: false,
    swimming: false,
    hungerCrisis: 0,
    fireMinutes: 0,
    thought: null,
    bornAt: 0,
    dead: false,
    ghost: false,
    holding: null,
    outfit: opts.outfit ?? randInt(world, 0, 7),
  };
  sim.mood = computeMood(sim.motives);
  world.sims[sim.id] = sim;
  return sim;
}

export function setThought(world: World, sim: Sim, icon: string, minutes = 30): void {
  sim.thought = { icon, until: world.totalMinutes + minutes };
}

/** Non-social utility: is the sim awake, alive, and on a lot? */
export function isActive(sim: Sim): boolean {
  return !sim.dead && !sim.ghost && sim.lotId !== null && !(sim.career?.atWork);
}

export const OUTFIT_COLORS = [
  '#2E8DFF', '#3FB87F', '#E0A53B', '#C75C86', '#7E8BE0', '#3FC5BC', '#E5544B',
  '#D9C77E',
];

/** rand kept imported for future gen variety without re-plumbing. */
export const _rngUtil = rand;
