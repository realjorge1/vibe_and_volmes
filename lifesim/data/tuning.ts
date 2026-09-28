/**
 * LifeSim tuning — every gameplay constant in one hot-editable file.
 * The decay curve is deliberately punishing (blueprint: "the pressure engine
 * is 8 decaying needs against a compressed clock").
 */

import type { MotiveId } from '../core/types';

// ─── Time ──────────────────────────────────────────────────────────────────
/** Real ms per driver tick; each driver tick advances N sim-minutes by speed. */
export const DRIVER_INTERVAL_MS = 500;
export const MINUTES_PER_TICK: Record<1 | 2 | 3, number> = { 1: 1, 2: 3, 3: 8 };
/** Baby → child after 3 sim-days. */
export const BABY_MINUTES = 3 * 1440;

// ─── Motive decay (per sim-HOUR, awake baseline) ───────────────────────────
export const DECAY: Record<MotiveId, number> = {
  hunger: 5.5,
  comfort: 3.0, // only while standing
  hygiene: 2.0,
  bladder: 4.0,
  energy: 5.0,
  fun: 2.5,
  social: 1.5,
  room: 0, // computed from environment, no decay
};

export const ASLEEP_DECAY: Partial<Record<MotiveId, number>> = {
  hunger: 1.5,
  bladder: 1.0,
  hygiene: 0.5,
  energy: 0, // energy REGAINS while sleeping (bed interaction effect)
};

/** Mood aggregation weights; negatives hurt 1.6x (pain > pleasure). */
export const MOOD_WEIGHTS: Record<MotiveId, number> = {
  hunger: 1.0,
  energy: 0.9,
  comfort: 0.5,
  hygiene: 0.4,
  bladder: 0.7,
  fun: 0.6,
  social: 0.6,
  room: 0.3,
};
export const MOOD_PAIN_MULT = 1.6;
export const MOOD_DIVISOR = 6.0;

// ─── Failure states ────────────────────────────────────────────────────────
export const BLADDER_FAIL = -97; // wets self
export const ENERGY_COLLAPSE = -97; // passes out where standing
export const HUNGER_CRISIS = -95; // starvation clock starts
export const STARVE_MINUTES = 1440; // one full day at rock bottom → death
export const DROWN_ENERGY = -85; // swimming below this with no ladder → drown
export const FIRE_DEATH_MINUTES = 3; // standing in flames

// ─── Movement / AI ─────────────────────────────────────────────────────────
export const WALK_TILES_PER_MIN = 3;
export const QUEUE_MAX = 8;
export const AUTONOMY_FUZZ = 8; // random score jitter (prevents robotic loops)
/** Below this best-score, a free-willed sim just idles. Scaled by slider. */
export const AUTONOMY_BASE_THRESHOLD = 14;
export const ADVERT_FALLOFF = 0.04; // score *= 1/(1 + dist * falloff)

// ─── Social / relationships ────────────────────────────────────────────────
export const REL_DECAY_PER_DAY = 2; // daily score drifts toward 0
export const FRIEND_THRESHOLD = 50;
export const ENEMY_THRESHOLD = -50;
export const LOVE_THRESHOLD = 70; // daily + lifetime/2 with romance history
export const VISIT_MINUTES = 180;
export const JEALOUSY_DAILY_HIT = -40;

// ─── Economy ───────────────────────────────────────────────────────────────
export const STARTING_FUNDS = 20000;
export const BILL_EVERY_DAYS = 3;
export const BILL_RATE = 0.006; // of total lot asset value, min below
export const BILL_MIN = 45;
export const REPO_AFTER_DAYS = 5;
export const DEPRECIATION_INITIAL = 0.15; // lose 15% the moment it's placed
export const DEPRECIATION_DAILY = 0.01;
export const DEPRECIATION_FLOOR = 0.4;
export const SNACK_COST = 5;
export const MEAL_COST = 20;
export const MAID_COST = 60; // per visit
export const REPAIR_COST_PER_FIX = 50;
export const PIZZA_COST = 40;
export const WALL_COST = 70;
export const WALL_REFUND = 35;
export const DOOR_COST = 100;
export const WINDOW_COST = 60;
export const FLOOR_COST = 20;
export const POOL_COST = 400; // per tile
export const PAINTING_SALE_BASE = 30; // + creativity * 16

// ─── Events ────────────────────────────────────────────────────────────────
export const BURGLAR_HOUR = 2;
export const BURGLAR_CHANCE = 0.07; // per night, if lot assets > threshold
export const BURGLAR_MIN_ASSETS = 2000;
export const FIRE_SPREAD_CHANCE = 0.13; // per minute per adjacent flammable
export const FIRE_MAX_TILES = 14;
export const COOK_FIRE_BASE = 0.05; // at cooking 0, scales down with skill
export const VISITOR_HOUR = 16;
export const VISITOR_CHANCE = 0.25;
export const GHOST_CHANCE = 0.2; // per urn per night
export const PLEAD_SUCCESS = 0.35;
export const BABY_NEGLECT_MINUTES = 360; // starving baby → social worker

// ─── Skills ────────────────────────────────────────────────────────────────
/** Skill points needed per level rise linearly: (level+1) * this. */
export const SKILL_HOURS_PER_LEVEL = 2.2;

// ─── Work ──────────────────────────────────────────────────────────────────
export const CARPOOL_LEAD_MINUTES = 60; // honks an hour before shift
export const MISSED_DAYS_FIRED = 2;
export const WORK_DECAY_MULT = 0.55; // motives decay slower off-lot
