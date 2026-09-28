/**
 * LifeSim object catalog — the smart objects. Every buyable (and every mess,
 * meal, and service prop) is declarative data: footprint, price, quality, and
 * a list of interactions that ADVERTISE motive payoffs into the world. Sims
 * never know what a fridge is; they only hear it shouting "Hunger +65".
 *
 * All names/flavor text are original. Emoji stand in for the model/sprite id.
 */

import type { Motives, MotiveId, SkillId, TraitId } from '../core/types';

export type BuyCategory =
  | 'seating'
  | 'surfaces'
  | 'sleep'
  | 'plumbing'
  | 'appliances'
  | 'electronics'
  | 'skill'
  | 'deco'
  | 'misc';

export interface AdvertSpec {
  motive: MotiveId;
  value: number;
  /** Optional personality scaling: score *= 0.4 + trait/10 * weight ... */
  trait?: TraitId;
  traitWeight?: number; // 0..2; higher = trait matters more
}

export interface ObjectInteraction {
  id: string;
  label: string;
  icon: string;
  /** Sim-minutes in the 'using' stage (generic handler). */
  duration: number;
  /** Total motive change applied pro-rata across the duration. */
  effects?: Partial<Motives>;
  advertises?: AdvertSpec[];
  skill?: { id: SkillId; perHour: number };
  /** May be chosen by free will (player can always command). */
  autonomous?: boolean;
  /** Scripted handler key in core/interactions.ts (meal chain, sleep...). */
  special?: string;
  adultOnly?: boolean;
  childOnly?: boolean;
  needsBroken?: boolean;
  needsDirty?: boolean;
  needsWorking?: boolean;
  cost?: number;
  /** Loop until this motive is (nearly) full instead of fixed duration. */
  exitWhenFull?: MotiveId;
  /** Sim stands ON the object tile (chairs, beds, pool ladder). */
  sitOn?: boolean;
}

export interface ObjectDef {
  id: string;
  name: string;
  icon: string;
  category: BuyCategory;
  price: number;
  w: number;
  h: number;
  blurb: string;
  /** Décor contribution to the Room motive (can be negative for messes). */
  roomScore?: number;
  quality?: 1 | 2 | 3;
  breakable?: boolean;
  /** Mean uses between failures. */
  mtbf?: number;
  /** Repairing risks electrocution (electronics/appliances). */
  shockRisk?: boolean;
  flammable?: boolean;
  /** Sims can walk through/over it (rugs, messes). */
  walkable?: boolean;
  light?: boolean;
  /** Not in the buy catalog (messes, meals, urns, mailbox). */
  unbuyable?: boolean;
  interactions: ObjectInteraction[];
}

const A = (
  motive: MotiveId,
  value: number,
  trait?: TraitId,
  traitWeight?: number
): AdvertSpec => ({ motive, value, trait, traitWeight });

export const CATALOG: Record<string, ObjectDef> = {
  // ─── Seating ─────────────────────────────────────────────────────────────
  chair_dining: {
    id: 'chair_dining', name: 'Slat-Back Chair', icon: '🪑', category: 'seating',
    price: 95, w: 1, h: 1, quality: 1, flammable: true,
    blurb: 'Four legs, most of the time.',
    interactions: [
      { id: 'sit', label: 'Sit', icon: '🪑', duration: 45, sitOn: true,
        effects: { comfort: 18 }, advertises: [A('comfort', 18)], autonomous: true },
    ],
  },
  armchair: {
    id: 'armchair', name: 'Plumpton Armchair', icon: '🛋️', category: 'seating',
    price: 320, w: 1, h: 1, quality: 2, roomScore: 1, flammable: true,
    blurb: 'Swallows guests whole. They report enjoying it.',
    interactions: [
      { id: 'sit', label: 'Sit', icon: '🛋️', duration: 60, sitOn: true,
        effects: { comfort: 35 }, advertises: [A('comfort', 32, 'active', -0.5)],
        autonomous: true, exitWhenFull: 'comfort' },
      { id: 'nap', label: 'Doze', icon: '😴', duration: 120, sitOn: true,
        effects: { energy: 20, comfort: 12 }, advertises: [A('energy', 14)], autonomous: true },
    ],
  },
  sofa_cheap: {
    id: 'sofa_cheap', name: 'Curbside Couch', icon: '🛋️', category: 'seating',
    price: 180, w: 2, h: 1, quality: 1, flammable: true,
    blurb: 'Previous owner unknown. Previous smells known.',
    interactions: [
      { id: 'sit', label: 'Sit', icon: '🛋️', duration: 60, sitOn: true,
        effects: { comfort: 22 }, advertises: [A('comfort', 20)], autonomous: true },
      { id: 'nap', label: 'Nap', icon: '😴', duration: 180, sitOn: true,
        effects: { energy: 35, comfort: 10 }, advertises: [A('energy', 20)], autonomous: true },
    ],
  },
  sofa_lux: {
    id: 'sofa_lux', name: 'Cloudbank Sectional', icon: '🛋️', category: 'seating',
    price: 1450, w: 3, h: 1, quality: 3, roomScore: 3, flammable: true,
    blurb: 'Upholstered in a fabric science cannot yet name.',
    interactions: [
      { id: 'sit', label: 'Sit', icon: '🛋️', duration: 60, sitOn: true,
        effects: { comfort: 45 }, advertises: [A('comfort', 40)], autonomous: true,
        exitWhenFull: 'comfort' },
      { id: 'nap', label: 'Nap', icon: '😴', duration: 180, sitOn: true,
        effects: { energy: 45, comfort: 20 }, advertises: [A('energy', 26)], autonomous: true },
    ],
  },

  // ─── Surfaces ────────────────────────────────────────────────────────────
  table_dining: {
    id: 'table_dining', name: 'Family Table', icon: '🟫', category: 'surfaces',
    price: 220, w: 2, h: 1, quality: 2, flammable: true,
    blurb: 'Seats a household and its arguments.',
    interactions: [],
  },
  counter: {
    id: 'counter', name: 'Chopping Counter', icon: '🔪', category: 'surfaces',
    price: 150, w: 1, h: 1, quality: 1,
    blurb: 'Meal prep happens here. So does crumb accumulation.',
    interactions: [],
  },
  desk: {
    id: 'desk', name: 'Homework Desk', icon: '🪵', category: 'surfaces',
    price: 140, w: 2, h: 1, quality: 1, flammable: true,
    blurb: 'A flat spot for a computer or unpaid bills.',
    interactions: [],
  },

  // ─── Sleep ───────────────────────────────────────────────────────────────
  bed_cheap: {
    id: 'bed_cheap', name: 'Spring Chorus Bed', icon: '🛏️', category: 'sleep',
    price: 300, w: 1, h: 2, quality: 1, flammable: true,
    blurb: 'Every spring sings a different note.',
    interactions: [
      { id: 'sleep', label: 'Sleep', icon: '😴', duration: 480, sitOn: true,
        special: 'sleep', effects: { energy: 60, comfort: 8 },
        advertises: [A('energy', 55)], autonomous: true, exitWhenFull: 'energy' },
      { id: 'make_bed', label: 'Make Bed', icon: '🧺', duration: 5, needsDirty: true,
        special: 'clean', advertises: [A('room', 10, 'neat', 1.6)], autonomous: true },
    ],
  },
  bed_lux: {
    id: 'bed_lux', name: 'Duke of Dreams Bed', icon: '🛏️', category: 'sleep',
    price: 3000, w: 2, h: 2, quality: 3, roomScore: 2, flammable: true,
    blurb: 'Guaranteed dreams of a mild, agreeable nature.',
    interactions: [
      { id: 'sleep', label: 'Sleep', icon: '😴', duration: 480, sitOn: true,
        special: 'sleep', effects: { energy: 100, comfort: 25 },
        advertises: [A('energy', 70)], autonomous: true, exitWhenFull: 'energy' },
      { id: 'make_bed', label: 'Make Bed', icon: '🧺', duration: 5, needsDirty: true,
        special: 'clean', advertises: [A('room', 10, 'neat', 1.6)], autonomous: true },
    ],
  },
  crib: {
    id: 'crib', name: 'Bumblebee Crib', icon: '👶', category: 'sleep',
    price: 340, w: 1, h: 1, quality: 2, flammable: true,
    blurb: 'Contains the uncontainable.',
    interactions: [
      { id: 'feed_baby', label: 'Feed Baby', icon: '🍼', duration: 15, adultOnly: true,
        special: 'feed_baby', advertises: [] },
      { id: 'play_baby', label: 'Play With Baby', icon: '🧸', duration: 15, adultOnly: true,
        special: 'play_baby', advertises: [] },
      { id: 'sing_baby', label: 'Sing To Baby', icon: '🎵', duration: 10, adultOnly: true,
        special: 'sing_baby', advertises: [] },
    ],
  },

  // ─── Plumbing ────────────────────────────────────────────────────────────
  toilet: {
    id: 'toilet', name: 'Porcelain Throne', icon: '🚽', category: 'plumbing',
    price: 240, w: 1, h: 1, quality: 1, breakable: true, mtbf: 40,
    blurb: 'All hail.',
    interactions: [
      { id: 'use', label: 'Use', icon: '🚽', duration: 8, sitOn: true, needsWorking: true,
        effects: { bladder: 100 }, advertises: [A('bladder', 70)],
        autonomous: true, special: 'use_toilet' },
      { id: 'unclog', label: 'Unclog', icon: '🔧', duration: 25, needsBroken: true,
        special: 'repair', advertises: [A('room', 8, 'neat', 1.2)], autonomous: true },
      { id: 'clean', label: 'Clean', icon: '🧽', duration: 10, needsDirty: true,
        special: 'clean', advertises: [A('room', 14, 'neat', 1.8)], autonomous: true },
    ],
  },
  shower: {
    id: 'shower', name: 'Drizzle Cabinet', icon: '🚿', category: 'plumbing',
    price: 350, w: 1, h: 1, quality: 1, breakable: true, mtbf: 45,
    blurb: 'Water pressure sold separately.',
    interactions: [
      { id: 'shower', label: 'Take Shower', icon: '🚿', duration: 25, sitOn: true,
        needsWorking: true, effects: { hygiene: 90 },
        advertises: [A('hygiene', 60, 'neat', 0.8)], autonomous: true, special: 'shower' },
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 30, needsBroken: true,
        special: 'repair', advertises: [A('room', 8, 'neat', 1.2)], autonomous: true },
      { id: 'clean', label: 'Clean', icon: '🧽', duration: 10, needsDirty: true,
        special: 'clean', advertises: [A('room', 12, 'neat', 1.8)], autonomous: true },
    ],
  },
  bathtub: {
    id: 'bathtub', name: 'Admiral Soaker', icon: '🛁', category: 'plumbing',
    price: 800, w: 1, h: 2, quality: 2, breakable: true, mtbf: 60, roomScore: 1,
    blurb: 'For thinking very hard about nothing.',
    interactions: [
      { id: 'bath', label: 'Take Bath', icon: '🛁', duration: 40, sitOn: true,
        needsWorking: true, effects: { hygiene: 95, comfort: 30 },
        advertises: [A('hygiene', 55), A('comfort', 25)], autonomous: true, special: 'shower' },
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 30, needsBroken: true,
        special: 'repair', advertises: [A('room', 8, 'neat', 1.2)], autonomous: true },
      { id: 'clean', label: 'Clean', icon: '🧽', duration: 12, needsDirty: true,
        special: 'clean', advertises: [A('room', 12, 'neat', 1.8)], autonomous: true },
    ],
  },
  sink: {
    id: 'sink', name: 'Suds Station', icon: '🫧', category: 'plumbing',
    price: 190, w: 1, h: 1, quality: 1, breakable: true, mtbf: 50,
    blurb: 'Hands, dishes, existential dread — all washable.',
    interactions: [
      { id: 'wash_hands', label: 'Wash Hands', icon: '🫧', duration: 4, needsWorking: true,
        effects: { hygiene: 12 }, advertises: [A('hygiene', 10, 'neat', 1.0)], autonomous: true },
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 25, needsBroken: true,
        special: 'repair', advertises: [A('room', 8, 'neat', 1.2)], autonomous: true },
    ],
  },

  // ─── Appliances ──────────────────────────────────────────────────────────
  fridge_cheap: {
    id: 'fridge_cheap', name: 'Frostbox 100', icon: '🧊', category: 'appliances',
    price: 600, w: 1, h: 1, quality: 1,
    blurb: 'Keeps food cold and secrets colder.',
    interactions: [
      { id: 'snack', label: 'Grab Snack (§5)', icon: '🥨', duration: 10,
        special: 'snack', advertises: [A('hunger', 30)], autonomous: true },
      { id: 'meal', label: 'Prepare Meal (§20)', icon: '🍳', duration: 12, adultOnly: true,
        special: 'prepare_meal', advertises: [A('hunger', 62)], autonomous: true },
    ],
  },
  fridge_lux: {
    id: 'fridge_lux', name: 'Glacier Royale', icon: '🧊', category: 'appliances',
    price: 2300, w: 1, h: 1, quality: 3, roomScore: 1,
    blurb: 'Chills produce to the exact temperature of luxury.',
    interactions: [
      { id: 'snack', label: 'Grab Snack (§5)', icon: '🥨', duration: 10,
        special: 'snack', advertises: [A('hunger', 34)], autonomous: true },
      { id: 'meal', label: 'Prepare Meal (§20)', icon: '🍳', duration: 12, adultOnly: true,
        special: 'prepare_meal', advertises: [A('hunger', 70)], autonomous: true },
    ],
  },
  stove: {
    id: 'stove', name: 'Ember Standard Stove', icon: '🔥', category: 'appliances',
    price: 400, w: 1, h: 1, quality: 1, breakable: true, mtbf: 55, shockRisk: true,
    blurb: 'Cooks food. Occasionally cooks kitchen.',
    interactions: [
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 35, needsBroken: true,
        special: 'repair', advertises: [A('room', 8, 'neat', 1.0)], autonomous: true },
    ],
  },
  stove_lux: {
    id: 'stove_lux', name: 'Chef Sovereign Range', icon: '🍳', category: 'appliances',
    price: 1200, w: 1, h: 1, quality: 3, breakable: true, mtbf: 90, shockRisk: true,
    roomScore: 1,
    blurb: 'Its pilot light burns with quiet ambition.',
    interactions: [
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 35, needsBroken: true,
        special: 'repair', advertises: [A('room', 8, 'neat', 1.0)], autonomous: true },
    ],
  },
  coffee_maker: {
    id: 'coffee_maker', name: 'Jitterbug Brewer', icon: '☕', category: 'appliances',
    price: 85, w: 1, h: 1, quality: 1,
    blurb: 'Legal stimulation on tap.',
    interactions: [
      { id: 'coffee', label: 'Drink Coffee', icon: '☕', duration: 8, adultOnly: true,
        effects: { energy: 12, bladder: -10 }, advertises: [A('energy', 10)], autonomous: true },
    ],
  },
  trash_can: {
    id: 'trash_can', name: 'Lidded Sentinel', icon: '🗑️', category: 'appliances',
    price: 30, w: 1, h: 1, quality: 1,
    blurb: 'Eats anything. Complains never.',
    interactions: [],
  },
  smoke_detector: {
    id: 'smoke_detector', name: 'Hawkeye Smoke Alarm', icon: '🚨', category: 'appliances',
    price: 50, w: 1, h: 1, quality: 1, walkable: true,
    blurb: 'Summons the fire brigade the moment things get toasty.',
    interactions: [],
  },
  burglar_alarm: {
    id: 'burglar_alarm', name: 'NightWatch Alarm', icon: '🔔', category: 'appliances',
    price: 250, w: 1, h: 1, quality: 1, walkable: true,
    blurb: 'Screams on your behalf at 2 AM.',
    interactions: [],
  },

  // ─── Electronics ─────────────────────────────────────────────────────────
  tv_cheap: {
    id: 'tv_cheap', name: 'Fuzzbox 20"', icon: '📺', category: 'electronics',
    price: 500, w: 1, h: 1, quality: 1, breakable: true, mtbf: 45, shockRisk: true,
    blurb: 'Three channels, one of them weather.',
    interactions: [
      { id: 'watch', label: 'Watch TV', icon: '📺', duration: 60, needsWorking: true,
        effects: { fun: 30 }, advertises: [A('fun', 26, 'playful', 0.6)],
        autonomous: true, special: 'watch_tv', exitWhenFull: 'fun' },
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 35, needsBroken: true,
        adultOnly: true, special: 'repair', advertises: [A('room', 6, 'neat', 1.0)],
        autonomous: true },
    ],
  },
  tv_lux: {
    id: 'tv_lux', name: 'Panorama Wall 55"', icon: '📺', category: 'electronics',
    price: 3500, w: 2, h: 1, quality: 3, breakable: true, mtbf: 80, shockRisk: true,
    roomScore: 2,
    blurb: 'So immersive you can smell the commercials.',
    interactions: [
      { id: 'watch', label: 'Watch TV', icon: '📺', duration: 60, needsWorking: true,
        effects: { fun: 55 }, advertises: [A('fun', 45, 'playful', 0.6)],
        autonomous: true, special: 'watch_tv', exitWhenFull: 'fun' },
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 35, needsBroken: true,
        adultOnly: true, special: 'repair', advertises: [A('room', 6, 'neat', 1.0)],
        autonomous: true },
    ],
  },
  stereo: {
    id: 'stereo', name: 'BoomCrate Hi-Fi', icon: '📻', category: 'electronics',
    price: 650, w: 1, h: 1, quality: 2, breakable: true, mtbf: 60, shockRisk: true,
    blurb: 'Neighbors will know your taste. All of it.',
    interactions: [
      { id: 'dance', label: 'Dance', icon: '💃', duration: 45, needsWorking: true,
        effects: { fun: 40, energy: -8 }, advertises: [A('fun', 34, 'playful', 0.9), A('social', 8)],
        autonomous: true, skill: { id: 'body', perHour: 0.3 } },
      { id: 'listen', label: 'Listen', icon: '🎧', duration: 30, needsWorking: true,
        effects: { fun: 18 }, advertises: [A('fun', 15)], autonomous: true },
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 30, needsBroken: true,
        special: 'repair', advertises: [A('room', 6, 'neat', 1.0)], autonomous: true },
    ],
  },
  computer: {
    id: 'computer', name: 'Cathode Dreams PC', icon: '💻', category: 'electronics',
    price: 1400, w: 1, h: 1, quality: 2, breakable: true, mtbf: 55, shockRisk: true,
    blurb: 'For work, games, and arguing with strangers.',
    interactions: [
      { id: 'play_games', label: 'Play Games', icon: '🎮', duration: 60, needsWorking: true,
        effects: { fun: 42 }, advertises: [A('fun', 36, 'playful', 1.0)],
        autonomous: true, exitWhenFull: 'fun' },
      { id: 'find_job', label: 'Find A Job', icon: '💼', duration: 15, needsWorking: true,
        adultOnly: true, special: 'find_job', advertises: [] },
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 40, needsBroken: true,
        adultOnly: true, special: 'repair', advertises: [A('room', 6, 'neat', 1.0)],
        autonomous: true },
    ],
  },
  phone: {
    id: 'phone', name: 'Chatterbox Wall Phone', icon: '📞', category: 'electronics',
    price: 75, w: 1, h: 1, quality: 1, walkable: true,
    blurb: 'Connects you to pizza, police, and everyone in between.',
    interactions: [
      { id: 'call_maid', label: 'Hire Maid (§60/day)', icon: '🧹', duration: 3,
        adultOnly: true, special: 'call_maid', advertises: [] },
      { id: 'call_repair', label: 'Call Repairman (§50/fix)', icon: '🔧', duration: 3,
        adultOnly: true, special: 'call_repair', advertises: [] },
      { id: 'call_pizza', label: 'Order Pizza (§40)', icon: '🍕', duration: 3,
        adultOnly: true, special: 'call_pizza', advertises: [] },
      { id: 'call_police', label: 'Call Police', icon: '🚓', duration: 2,
        special: 'call_police', advertises: [] },
      { id: 'call_fire', label: 'Call Fire Dept.', icon: '🚒', duration: 2,
        special: 'call_fire', advertises: [] },
      { id: 'invite', label: 'Invite Someone Over', icon: '🏠', duration: 4,
        special: 'invite', advertises: [] },
      { id: 'party', label: 'Throw A Party', icon: '🎈', duration: 5, adultOnly: true,
        special: 'party', advertises: [] },
    ],
  },
  pinball: {
    id: 'pinball', name: 'Meteor Alley Pinball', icon: '🕹️', category: 'electronics',
    price: 1800, w: 1, h: 2, quality: 3, breakable: true, mtbf: 70, shockRisk: true,
    roomScore: 1,
    blurb: 'Tilt at your own social peril.',
    interactions: [
      { id: 'play', label: 'Play Pinball', icon: '🕹️', duration: 40, needsWorking: true,
        effects: { fun: 48 }, advertises: [A('fun', 40, 'playful', 1.2)], autonomous: true },
      { id: 'repair', label: 'Repair', icon: '🔧', duration: 35, needsBroken: true,
        special: 'repair', advertises: [A('room', 6, 'neat', 1.0)], autonomous: true },
    ],
  },

  // ─── Skill objects ───────────────────────────────────────────────────────
  bookshelf: {
    id: 'bookshelf', name: 'Leaning Tower of Paper', icon: '📚', category: 'skill',
    price: 250, w: 1, h: 1, quality: 1, flammable: true, roomScore: 1,
    blurb: 'Knowledge by the shelf-foot.',
    interactions: [
      { id: 'read', label: 'Read A Novel', icon: '📖', duration: 60,
        effects: { fun: 22 }, advertises: [A('fun', 16, 'playful', -0.4)], autonomous: true },
      { id: 'study_cooking', label: 'Study Cooking', icon: '🍳', duration: 90,
        effects: { fun: -5 }, skill: { id: 'cooking', perHour: 1.0 }, advertises: [] },
      { id: 'study_mech', label: 'Study Mechanics', icon: '🔧', duration: 90,
        effects: { fun: -5 }, skill: { id: 'mechanical', perHour: 1.0 }, advertises: [] },
    ],
  },
  mirror: {
    id: 'mirror', name: 'Honest Mirror', icon: '🪞', category: 'skill',
    price: 100, w: 1, h: 1, quality: 1, walkable: true,
    blurb: 'Reflects, but never flatters.',
    interactions: [
      { id: 'practice_speech', label: 'Practice Speech', icon: '🗣️', duration: 60,
        effects: { fun: 4 }, skill: { id: 'charisma', perHour: 1.0 },
        advertises: [A('fun', 4, 'outgoing', 1.0)], autonomous: true },
    ],
  },
  chess: {
    id: 'chess', name: 'Grandmaster Set', icon: '♟️', category: 'skill',
    price: 500, w: 1, h: 1, quality: 2, roomScore: 1,
    blurb: 'The pieces judge your openings silently.',
    interactions: [
      { id: 'play_chess', label: 'Play Chess', icon: '♟️', duration: 60,
        effects: { fun: 18 }, skill: { id: 'logic', perHour: 1.1 },
        advertises: [A('fun', 12, 'playful', -0.3)], autonomous: true },
    ],
  },
  easel: {
    id: 'easel', name: 'Starving Artist Easel', icon: '🎨', category: 'skill',
    price: 330, w: 1, h: 1, quality: 1, flammable: true,
    blurb: 'Paint your feelings, then sell them.',
    interactions: [
      { id: 'paint', label: 'Paint', icon: '🎨', duration: 120, adultOnly: true,
        effects: { fun: 20 }, skill: { id: 'creativity', perHour: 1.1 },
        special: 'paint', advertises: [A('fun', 12, 'playful', 0.4)], autonomous: true },
    ],
  },
  exercise_bench: {
    id: 'exercise_bench', name: 'Iron Resolve Bench', icon: '🏋️', category: 'skill',
    price: 700, w: 1, h: 2, quality: 2,
    blurb: 'No pain, no gain. Some pain, some gain.',
    interactions: [
      { id: 'work_out', label: 'Work Out', icon: '🏋️', duration: 60, adultOnly: true,
        effects: { fun: 8, hygiene: -25, energy: -12 },
        skill: { id: 'body', perHour: 1.2 },
        advertises: [A('fun', 10, 'active', 1.4)], autonomous: true },
    ],
  },
  piano: {
    id: 'piano', name: 'Baby Grand "Nocturne"', icon: '🎹', category: 'skill',
    price: 2800, w: 2, h: 2, quality: 3, roomScore: 3, flammable: true,
    blurb: 'Eighty-eight keys to the hearts of onlookers.',
    interactions: [
      { id: 'play_piano', label: 'Play Piano', icon: '🎹', duration: 60,
        effects: { fun: 30 }, skill: { id: 'creativity', perHour: 1.0 },
        advertises: [A('fun', 22, 'playful', 0.5)], autonomous: true },
    ],
  },

  // ─── Deco ────────────────────────────────────────────────────────────────
  plant_potted: {
    id: 'plant_potted', name: 'Unkillable Fern', icon: '🪴', category: 'deco',
    price: 45, w: 1, h: 1, quality: 1, roomScore: 1, walkable: false,
    blurb: 'Survives neglect. Thrives on it, honestly.',
    interactions: [],
  },
  painting_wall: {
    id: 'painting_wall', name: '"Lake, Probably"', icon: '🖼️', category: 'deco',
    price: 180, w: 1, h: 1, quality: 1, roomScore: 2, walkable: true,
    blurb: 'Art critics remain divided on what it depicts.',
    interactions: [],
  },
  sculpture: {
    id: 'sculpture', name: 'Abstract Obelisk', icon: '🗿', category: 'deco',
    price: 900, w: 1, h: 1, quality: 3, roomScore: 4,
    blurb: 'It means whatever you paid for it.',
    interactions: [],
  },
  lamp_floor: {
    id: 'lamp_floor', name: 'Moonstalk Lamp', icon: '💡', category: 'deco',
    price: 90, w: 1, h: 1, quality: 1, light: true, roomScore: 1,
    blurb: 'Banishes gloom to the corners it came from.',
    interactions: [],
  },
  rug: {
    id: 'rug', name: 'Heirloom Rug', icon: '🟥', category: 'deco',
    price: 120, w: 2, h: 2, quality: 1, roomScore: 1, walkable: true, flammable: true,
    blurb: 'Ties the room together.',
    interactions: [],
  },
  aquarium: {
    id: 'aquarium', name: 'Glass Lagoon', icon: '🐠', category: 'deco',
    price: 320, w: 1, h: 1, quality: 2, roomScore: 2,
    blurb: 'Tiny fish, enormous serenity.',
    interactions: [
      { id: 'watch_fish', label: 'Watch Fish', icon: '🐠', duration: 15,
        effects: { fun: 10 }, advertises: [A('fun', 8)], autonomous: true },
    ],
  },
  pool_ladder: {
    id: 'pool_ladder', name: 'Pool Ladder', icon: '🪜', category: 'misc',
    price: 150, w: 1, h: 1, quality: 1, walkable: true,
    blurb: 'The only exit strategy that matters.',
    interactions: [
      { id: 'swim', label: 'Swim', icon: '🏊', duration: 60, special: 'swim',
        effects: { fun: 35, hygiene: 15, energy: -15 },
        advertises: [A('fun', 28, 'active', 1.0)], autonomous: true,
        skill: { id: 'body', perHour: 0.6 } },
    ],
  },

  // ─── Unbuyable props (messes, meals, service objects) ────────────────────
  mailbox: {
    id: 'mailbox', name: 'Mailbox', icon: '📫', category: 'misc',
    price: 0, w: 1, h: 1, unbuyable: true,
    blurb: 'Bills only. Never letters.',
    interactions: [
      { id: 'get_mail', label: 'Get Mail', icon: '📬', duration: 3,
        special: 'get_mail', advertises: [] },
      { id: 'pay_bills', label: 'Pay Bills', icon: '💸', duration: 5, adultOnly: true,
        special: 'pay_bills', advertises: [] },
    ],
  },
  newspaper: {
    id: 'newspaper', name: 'The Daily Buglehorn', icon: '📰', category: 'misc',
    price: 0, w: 1, h: 1, unbuyable: true, walkable: true, flammable: true,
    roomScore: -1,
    blurb: 'Today’s news, tomorrow’s clutter.',
    interactions: [
      { id: 'read_paper', label: 'Read Paper', icon: '📰', duration: 20,
        effects: { fun: 10 }, advertises: [A('fun', 6, 'playful', -0.4)], autonomous: true },
      { id: 'find_job_paper', label: 'Look For Job', icon: '💼', duration: 10,
        adultOnly: true, special: 'find_job', advertises: [] },
      { id: 'toss_paper', label: 'Throw Away', icon: '🗑️', duration: 4,
        special: 'clean_mess', advertises: [A('room', 8, 'neat', 1.6)], autonomous: true },
    ],
  },
  meal_plate: {
    id: 'meal_plate', name: 'Hot Meal', icon: '🍽️', category: 'misc',
    price: 0, w: 1, h: 1, unbuyable: true, walkable: true,
    blurb: 'Best consumed before the flies vote.',
    interactions: [
      { id: 'eat', label: 'Eat', icon: '🍽️', duration: 20, special: 'eat_meal',
        advertises: [A('hunger', 55)], autonomous: true },
    ],
  },
  plate_dirty: {
    id: 'plate_dirty', name: 'Dirty Dishes', icon: '🥣', category: 'misc',
    price: 0, w: 1, h: 1, unbuyable: true, walkable: true, roomScore: -2,
    blurb: 'A civilization of crumbs rises.',
    interactions: [
      { id: 'clean_up', label: 'Clean Up', icon: '🧽', duration: 8,
        special: 'clean_mess', advertises: [A('room', 12, 'neat', 1.8)], autonomous: true },
    ],
  },
  puddle: {
    id: 'puddle', name: 'Puddle', icon: '💧', category: 'misc',
    price: 0, w: 1, h: 1, unbuyable: true, walkable: true, roomScore: -2,
    blurb: 'Of unknown and unwelcome origin.',
    interactions: [
      { id: 'mop', label: 'Mop Up', icon: '🧹', duration: 6,
        special: 'clean_mess', advertises: [A('room', 12, 'neat', 1.8)], autonomous: true },
    ],
  },
  ash_pile: {
    id: 'ash_pile', name: 'Ash Pile', icon: '🌫️', category: 'misc',
    price: 0, w: 1, h: 1, unbuyable: true, walkable: true, roomScore: -3,
    blurb: 'Formerly furniture.',
    interactions: [
      { id: 'sweep', label: 'Sweep Up', icon: '🧹', duration: 8,
        special: 'clean_mess', advertises: [A('room', 12, 'neat', 1.6)], autonomous: true },
    ],
  },
  trash_pile: {
    id: 'trash_pile', name: 'Trash Pile', icon: '🗑️', category: 'misc',
    price: 0, w: 1, h: 1, unbuyable: true, walkable: true, roomScore: -3,
    blurb: 'It grows if you look away.',
    interactions: [
      { id: 'clean_up', label: 'Clean Up', icon: '🧹', duration: 8,
        special: 'clean_mess', advertises: [A('room', 12, 'neat', 1.8)], autonomous: true },
    ],
  },
  pizza_box: {
    id: 'pizza_box', name: 'Meteor Pizza', icon: '🍕', category: 'misc',
    price: 0, w: 1, h: 1, unbuyable: true, walkable: true,
    blurb: 'Eight slices of molten diplomacy.',
    interactions: [
      { id: 'eat_pizza', label: 'Eat Pizza', icon: '🍕', duration: 15, special: 'eat_pizza',
        advertises: [A('hunger', 50)], autonomous: true },
      { id: 'toss_box', label: 'Throw Away', icon: '🗑️', duration: 4,
        special: 'clean_mess', advertises: [A('room', 8, 'neat', 1.6)], autonomous: true },
    ],
  },
  urn: {
    id: 'urn', name: 'Memorial Urn', icon: '⚱️', category: 'misc',
    price: 0, w: 1, h: 1, unbuyable: true, roomScore: -1,
    blurb: 'Someone lived. Someone microwaved forks.',
    interactions: [
      { id: 'mourn', label: 'Mourn', icon: '😢', duration: 15,
        effects: { social: 10, fun: -10 }, advertises: [], autonomous: false },
    ],
  },
};

/** Buy-catalog listing order per category. */
export const BUY_CATEGORIES: { id: BuyCategory; label: string; icon: string }[] = [
  { id: 'seating', label: 'Seating', icon: '🪑' },
  { id: 'surfaces', label: 'Surfaces', icon: '🟫' },
  { id: 'sleep', label: 'Sleep', icon: '🛏️' },
  { id: 'plumbing', label: 'Plumbing', icon: '🚿' },
  { id: 'appliances', label: 'Appliances', icon: '🧊' },
  { id: 'electronics', label: 'Electronics', icon: '📺' },
  { id: 'skill', label: 'Skill', icon: '📚' },
  { id: 'deco', label: 'Deco', icon: '🪴' },
  { id: 'misc', label: 'Misc', icon: '🪜' },
];

export const FLOOR_STYLES = [
  { id: 0, label: 'Grass', color: '#1E3B23' },
  { id: 1, label: 'Cheap Tile', color: '#3A3F47' },
  { id: 2, label: 'Hardwood', color: '#4A3826' },
  { id: 3, label: 'Checker', color: '#3E3A2E' },
  { id: 4, label: 'Carpet', color: '#3A2E42' },
  { id: 5, label: 'Stone', color: '#33383B' },
];

export function getDef(defId: string): ObjectDef {
  const def = CATALOG[defId];
  if (!def) throw new Error(`Unknown object def: ${defId}`);
  return def;
}
