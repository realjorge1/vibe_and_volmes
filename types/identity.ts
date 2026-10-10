import type { PlayerStats, MusicGenre } from './player';
import type { MentalAxis } from './events';
import type { ActivityCategory, LifeStageId } from './life';
import type { CareerPhase, MentalState } from './industry';
import type { ReleaseReception } from './music';
import type { PartnerBond, PersonRole } from './people';

/**
 * WHO THE ARTIST IS — and what they want.
 *
 * Traits are the artist's personality (picked two at the start of a life,
 * more earned by living it). Wants and fears are the short goals that refresh
 * week to week; a Dream is the one big thing for a life stage. Seeds are the
 * choices that come back years later. Eras are the looks and personas the
 * artist moves through. Everything here reads an IdentitySnapshot: one
 * picture of the career, so goals, trait rules and challenges stay pure.
 */

// ─── Traits ──────────────────────────────────────────────────────────────────

export interface TraitEffects {
  /** Skill points added when an activity in this category tilts toward luck. */
  activityTilt?: Partial<Record<ActivityCategory, number>>;
  /** Mental pressure every week while held. */
  weeklyMental?: Partial<Record<MentalAxis, number>>;
  /** Stat drift every week while held (small; decay pulls it back). */
  weeklyStats?: Partial<Record<keyof PlayerStats, number>>;
  /** Added to the critics' score of every release. */
  criticsBonus?: number;
  /** First-week streams multiplier on every release (1 = none). */
  streamsMult?: number;
  /** Points added to every live show. */
  showBonus?: number;
  /** Extra activities each week. */
  extraActivities?: number;
  /** Points with award voters. */
  awardsBonus?: number;
  /** Multiplier on the chance a risky moment becomes a criminal charge. */
  arrestRisk?: number;
  /** Rival-war swings in the artist's favor (added to positive swings). */
  warBonus?: number;
}

export interface TraitDef {
  id: string;
  label: string;
  /** One line of personality. */
  blurb: string;
  /** Ionicons glyph. */
  icon: string;
  color: string;
  /** Offered at the start of a life; the rest are earned. */
  starter: boolean;
  /** Traits it cannot coexist with: gaining one drops the other. */
  conflicts?: string[];
  effects: TraitEffects;
  /** What it does, in plain words, for the UI. */
  perks: string[];
}

/** An earned trait: granted the first week its test passes. */
export interface TraitRule {
  trait: string;
  test: (s: IdentitySnapshot) => boolean;
  /** The Deck line when it is earned. */
  line: string;
}

// ─── The snapshot every goal reads ────────────────────────────────────────────

export interface IdentitySnapshot {
  week: number;
  /** 1..WEEKS_PER_YEAR: where the week falls in the music calendar. */
  yearWeek: number;
  /** 1 for the first year of the career. */
  careerYear: number;
  age: number;
  lifeStage: LifeStageId;
  stats: PlayerStats;
  money: number;
  genre: MusicGenre;
  traits: string[];
  tags: string[];
  // Music
  releases: number;
  lastReleaseWeek: number | null;
  lastReception: ReleaseReception | null;
  lastCritics: number | null;
  /** Best position any song holds on this week's chart. */
  bestPositionNow: number | null;
  bestPositionEver: number | null;
  number1s: number;
  top10s: number;
  viral: number;
  totalStreams: number;
  labelOwnedTracks: number;
  rerecords: number;
  // Career
  arcPhase: CareerPhase;
  comebacks: number;
  peakFans: number;
  hasContract: boolean;
  onTour: boolean;
  toursDone: number;
  showsPlayed: number;
  bestShow: number;
  festivalsPlayed: number;
  headlinedFestival: boolean;
  nominations: number;
  /** Nominated at this year's show, and the night hasn't happened yet. */
  nominatedNow: boolean;
  awardsWon: number;
  bigAwardsWon: number;
  lifetimeEarnings: number;
  // Public life
  controversyActive: boolean;
  controversiesSurvived: number;
  /** The hottest rival war's public-opinion score (50 = even), or null. */
  warScore: number | null;
  rivalName: string | null;
  charityActs: number;
  scandals: number;
  // Personal life
  partnerBond: PartnerBond | null;
  children: number;
  /** The warmest parent's affinity, or null with no parents. */
  parentAffinity: number | null;
  friends: number;
  breakups: number;
  /** 0 (childhood bedroom) .. 4 (mansion). */
  homeRank: number;
  luxuryCount: number;
  statusScore: number;
  mental: MentalState;
  inJail: boolean;
  servedTime: boolean;
  // Mogul
  ownsLabel: boolean;
  signees: number;
  starSignees: number;
  ventures: number;
  // Identity
  eras: number;
  dreamsFulfilled: number;
  wantsMet: number;
}

// ─── Wants & fears ────────────────────────────────────────────────────────────

export type WantKind = 'want' | 'fear';

export interface WantReward {
  xp?: number;
  stats?: Partial<Record<keyof PlayerStats, number>>;
  mental?: Partial<Record<MentalAxis, number>>;
}

export interface WantDef {
  id: string;
  kind: WantKind;
  /**
   * Short and Deck-ready. Tokens filled when rolled: {n} (the target,
   * formatted), {money}, {rival}, {parent}, {partner}.
   */
  text: string;
  icon: string;
  /** Weeks to make it happen (a want) / weeks it hangs over you (a fear). */
  weeks: number;
  weight: number;
  /** Traits that make it likelier (each doubles the weight). */
  traits?: string[];
  eligible: (s: IdentitySnapshot) => boolean;
  /** The bar to clear, fixed when rolled. */
  target?: (s: IdentitySnapshot) => number;
  /** Wants: fulfilled. Fears: came true. `since` is the week it was rolled. */
  met: (s: IdentitySnapshot, target: number, since: number) => boolean;
  /** Fears only: judged on the due week, not before ("still a one-hit wonder"). */
  atDeadline?: boolean;
  /** Wants: the reward. Fears: the damage when it comes true. */
  payoff: WantReward;
  /** Fears only: what facing it down gives when it never happens. */
  relief?: WantReward;
  /** How {n} reads: a fan count, money, a chart position, or plain. */
  format?: 'fans' | 'money' | 'position' | 'plain';
}

export interface ActiveWant {
  uid: string;
  defId: string;
  kind: WantKind;
  /** Filled text. */
  text: string;
  icon: string;
  rolledWeek: number;
  dueWeek: number;
  target: number;
}

export type WantOutcome = 'met' | 'missed' | 'came-true' | 'faced';

export interface WantLogEntry {
  week: number;
  defId?: string;
  text: string;
  kind: WantKind;
  outcome: WantOutcome;
}

// ─── Dreams ───────────────────────────────────────────────────────────────────

export interface DreamDef {
  id: string;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /** Life stages that offer it. */
  stages: LifeStageId[];
  eligible?: (s: IdentitySnapshot) => boolean;
  met: (s: IdentitySnapshot) => boolean;
  /** Legacy points the Chronicle adds when it comes true. */
  legacy: number;
  xp: number;
}

export interface ActiveDream {
  defId: string;
  chosenWeek: number;
  stage: LifeStageId;
}

export interface DreamOffer {
  stage: LifeStageId;
  options: string[];
}

export interface DreamRecord {
  defId: string;
  label: string;
  week: number;
  age: number;
  fulfilled: boolean;
}

// ─── Seeds: choices that come back ────────────────────────────────────────────

/**
 * Who a seed is about. A person role means the person the event named;
 * 'seed' carries over whoever the paid-off seed was about (a story's next
 * chapter).
 */
export type SeedWho = 'npc' | 'new' | 'rival' | 'seed' | PersonRole | 'none';

/** Written on an outcome: plant a seed when this is chosen. */
export interface SeedPlant {
  kind: string;
  /** Weeks until it can come back: [min, max]. */
  after: [number, number];
  who?: SeedWho;
  /** The memory, in the same voice as the outcome ("You lent {npc} $500."). */
  note: string;
  // Filled in when the event or activity is resolved:
  name?: string;
  npcId?: string;
  personId?: string;
  rivalId?: string;
}

export interface Seed {
  id: string;
  kind: string;
  plantedWeek: number;
  /** Payoffs become possible from this week. */
  ripeWeek: number;
  /** Forgotten if nothing has come of it by then. */
  expiresWeek: number;
  name?: string;
  npcId?: string;
  personId?: string;
  rivalId?: string;
  /** The original deed, filled. */
  note: string;
}

// ─── Eras ─────────────────────────────────────────────────────────────────────

export type EraPersona =
  | 'sweetheart'
  | 'villain'
  | 'mysterious'
  | 'party'
  | 'conscious'
  | 'heartbroken';

export interface EraPersonaDef {
  id: EraPersona;
  label: string;
  blurb: string;
  icon: string;
  /** Release modifiers while the era lasts. */
  streamsMult: number;
  criticsBonus: number;
  /** Weekly drift while the era lasts. */
  weekly: Partial<Record<keyof PlayerStats, number>>;
  /** How the internet reads the rollout (moment valence). */
  valence: number;
}

export interface EraAestheticDef {
  id: string;
  label: string;
  blurb: string;
  icon: string;
}

export interface Era {
  id: string;
  name: string;
  color: string;
  aesthetic: string;
  persona: EraPersona;
  startedWeek: number;
  endedWeek: number | null;
  trackIds: string[];
  /** Best chart peak of a song released in the era. */
  peak: number | null;
}

// ─── Comeback ─────────────────────────────────────────────────────────────────

export interface ComebackState {
  announcedWeek: number;
  /** 0..100: builds weekly until the comeback record drops. */
  hype: number;
}

// ─── Challenges (cross-life) ──────────────────────────────────────────────────

export interface ChallengeStep {
  label: string;
  test: (s: IdentitySnapshot) => boolean;
}

export interface ChallengeDef {
  id: string;
  title: string;
  blurb: string;
  icon: string;
  color: string;
  steps: ChallengeStep[];
  /** Lifetime legacy points for finishing it. */
  legacy: number;
}

export interface ChallengeRun {
  id: string;
  acceptedWeek: number;
  /** Steps stay done once done. */
  done: boolean[];
  completedWeek: number | null;
}

// ─── Scenarios (how a life starts) ────────────────────────────────────────────

export interface ScenarioPastHit {
  title: string;
  /** Weeks before week 1 it came out. */
  weeksAgo: number;
  peak: number;
  /** Its weekly streams now. */
  weeklyStreams: number;
  totalStreams: number;
  viral: boolean;
  /** Owned by the label the artist was on. */
  labelOwned: boolean;
}

export interface ScenarioDef {
  id: string;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  /** Fixed starting age (the age step is skipped). */
  age?: number;
  /** Replaces the archetype's starting money. */
  money?: number;
  /** Added to the starting fans. */
  fans?: number;
  stats?: Partial<PlayerStats>;
  tags?: string[];
  traits?: string[];
  mental?: Partial<Record<MentalAxis, number>>;
  pastHit?: ScenarioPastHit;
  seeds?: SeedPlant[];
  /** One parent is famous and pays an allowance. */
  famousParent?: boolean;
  /** The first Deck line. {artist} is filled. */
  intro: string;
  /** Lifetime legacy needed before it can be picked. */
  unlockLegacy: number;
}
