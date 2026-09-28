/**
 * LifeSim — core simulation types.
 *
 * The entire sim state is plain serializable data (no classes, no functions)
 * so a World can be JSON-persisted through the existing SQLite gameRepository
 * and every system stays a pure function over it. Content (objects, socials,
 * careers) lives in lifesim/data as declarative defs referenced by id — the
 * "everything is data" modding seam from the blueprint.
 */

export type MotiveId =
  | 'hunger'
  | 'comfort'
  | 'hygiene'
  | 'bladder'
  | 'energy'
  | 'fun'
  | 'social'
  | 'room';

export type SkillId =
  | 'cooking'
  | 'mechanical'
  | 'charisma'
  | 'body'
  | 'logic'
  | 'creativity';

export type TraitId = 'neat' | 'outgoing' | 'active' | 'playful' | 'nice';

export type Age = 'baby' | 'child' | 'adult';

export type Motives = Record<MotiveId, number>; // each -100..100

export type Personality = Record<TraitId, number>; // each 0..10, 25 pts total

export type NpcRole =
  | 'maid'
  | 'repairman'
  | 'pizza'
  | 'burglar'
  | 'police'
  | 'firefighter'
  | 'reaper'
  | 'social_worker'
  | 'repo';

export interface Relationship {
  daily: number; // -100..100, decays toward 0 without contact
  lifetime: number; // -100..100, slow-moving
  friend: boolean;
  love: boolean;
  enemy: boolean;
  lastDay: number; // last day the two interacted
}

export interface QueuedAction {
  id: string;
  kind: 'object' | 'social' | 'goto' | 'system';
  label: string;
  icon: string;
  objectId?: string;
  interactionId?: string;
  targetSimId?: string;
  socialId?: string;
  x?: number;
  y?: number;
  /** Forced actions (panic, carpool) cannot be player-cancelled. */
  forced?: boolean;
  /** Chosen by free will — player commands interrupt these instantly. */
  auto?: boolean;
}

export interface ActiveAction extends QueuedAction {
  /** Handler-specific stage, always starts at 'route'. */
  stage: string;
  /** Sim-minutes remaining in the current stage. */
  ticksLeft: number;
  data: Record<string, unknown>;
}

export interface CareerState {
  trackId: string;
  level: number; // 0-based index into track levels
  performance: number; // -100..100
  missedDays: number;
  atWork: boolean;
  daysWorked: number;
}

export interface Sim {
  id: string;
  name: string;
  age: Age;
  householdId: string | null; // null for service NPCs
  npc?: NpcRole;
  lotId: string | null; // lot the sim is currently on
  pos: { x: number; y: number };
  path: { x: number; y: number }[] | null;
  personality: Personality;
  zodiac: string;
  motives: Motives;
  mood: number; // derived each tick, cached for UI/AI
  skills: Record<SkillId, number>; // 0..10 fractional
  relationships: Record<string, Relationship>;
  career: CareerState | null;
  grade: number; // children: 0..100 school grade
  queue: QueuedAction[];
  action: ActiveAction | null;
  asleep: boolean;
  passedOut: boolean;
  swimming: boolean;
  /** Sim-minutes spent at rock-bottom hunger (starvation timer). */
  hungerCrisis: number;
  /** Consecutive sim-minutes standing in flames. */
  fireMinutes: number;
  thought: { icon: string; until: number } | null;
  bornAt: number; // totalMinutes (babies age up after BABY_MINUTES)
  dead: boolean;
  ghost: boolean;
  /** totalMinutes a visitor intends to leave; undefined for residents. */
  visitLeaveAt?: number;
  /** Visitors must be greeted before entering the house. */
  greeted?: boolean;
  holding: string | null; // objectId carried (meal plate, bottle)
  outfit: number; // palette index — the sim's visual identity
}

export interface WorldObject {
  id: string;
  defId: string;
  x: number;
  y: number;
  broken: boolean;
  dirty: boolean;
  value: number; // current depreciated resale value
  boughtDay: number;
  inUseBy: string[];
  onFire: boolean;
  uses: number;
  carriedBy: string | null;
  data: Record<string, unknown>; // meal freshness, painting progress, etc.
}

export interface Tile {
  floor: number; // 0 = grass, >0 = floor style index
  wall: boolean;
  door: boolean;
  window: boolean;
  pool: boolean;
  fire: number; // minutes burning; 0 = not on fire
}

export interface Bill {
  amount: number;
  issuedDay: number;
}

export interface Lot {
  id: string;
  name: string;
  w: number;
  h: number;
  price: number;
  tiles: Tile[]; // row-major w*h
  objects: Record<string, WorldObject>;
  householdId: string | null;
  spawn: { x: number; y: number }; // street edge: NPC + visitor entry
  maidHired: boolean;
}

export interface Household {
  id: string;
  name: string;
  funds: number;
  simIds: string[];
  lotId: string | null;
  bills: Bill[];
}

export interface GameDialog {
  id: string;
  kind: 'chanceCard' | 'baby' | 'plead' | 'info' | 'jobOffer';
  title: string;
  body: string;
  options: { id: string; label: string }[];
  simId?: string;
  data?: Record<string, unknown>;
}

export interface PendingService {
  role: NpcRole | 'visitor' | 'party_guest';
  lotId: string;
  arriveAt: number; // totalMinutes
  data?: Record<string, unknown>;
}

export interface LogEntry {
  at: number; // totalMinutes
  text: string;
  icon: string;
}

export interface World {
  seed: number;
  rngState: number;
  day: number; // 1-based; day 1 = Monday
  minute: number; // 0..1439 within the day
  totalMinutes: number;
  speed: 0 | 1 | 2 | 3;
  mode: 'live' | 'buy' | 'build';
  activeLotId: string | null;
  selectedSimId: string | null;
  /** The artist's household — its funds mirror the music game's wallet. */
  playerHouseholdId: string | null;
  autonomy: number; // 0..100 free-will slider
  sims: Record<string, Sim>;
  lots: Record<string, Lot>;
  households: Record<string, Household>;
  dialogs: GameDialog[];
  log: LogEntry[];
  services: PendingService[];
  cheats: { unbreakable: boolean; moveObjects: boolean };
  idSeq: number;
}

export const MOTIVE_IDS: MotiveId[] = [
  'hunger',
  'comfort',
  'hygiene',
  'bladder',
  'energy',
  'fun',
  'social',
  'room',
];

export const SKILL_IDS: SkillId[] = [
  'cooking',
  'mechanical',
  'charisma',
  'body',
  'logic',
  'creativity',
];

export const TRAIT_IDS: TraitId[] = ['neat', 'outgoing', 'active', 'playful', 'nice'];

export function newId(world: World, prefix: string): string {
  world.idSeq += 1;
  return `${prefix}_${world.idSeq}`;
}

export function clampMotive(v: number): number {
  return Math.max(-100, Math.min(100, v));
}

/** Day of week 1..7 (1 = Monday, 6/7 = weekend). */
export function weekday(day: number): number {
  return ((day - 1) % 7) + 1;
}

export function clockLabel(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
