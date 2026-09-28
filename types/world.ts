import type { MusicGenre } from './player';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  LIVING WORLD / NPC LIFE ENGINE — DATA MODEL
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Every celebrity, label, journalist, influencer and fan community in the
 * game world is a single `Npc`. The world advances one week at a time and
 * NPCs live their lives — releasing music, feuding, dating, signing deals,
 * touring, melting down and retiring — entirely independently of the player.
 *
 * Design goals baked into this schema:
 *  - Homogeneous: every actor is the same `Npc` shape so the simulation can
 *    iterate one flat array. Role-specific data lives in `roleData`.
 *  - Sparse relationships: an NPC only stores edges to people it actually
 *    knows, so memory stays O(actors * avg-degree) not O(actors^2).
 *  - Deterministic-friendly: nothing here references wall-clock or RNG; all
 *    randomness is injected by the engine from a seed.
 */

export type NpcRole =
  | 'artist'
  | 'influencer'
  | 'journalist'
  | 'label'
  | 'producer'
  | 'fan-community';

export type CareerStage =
  | 'undiscovered'
  | 'rising'
  | 'established'
  | 'star'
  | 'legend'
  | 'declining'
  | 'retired';

// ─── Personality ──────────────────────────────────────────────────────────
// Stable traits, 0-100. These bias every decision an NPC makes but never
// change week to week (people don't fundamentally change overnight).
export interface PersonalityTraits {
  ambition: number;    // drive to grow, take risks, chase opportunities
  ego: number;         // status hunger; high ego starts beefs and feels slights
  loyalty: number;     // honors deals & allies; resists betrayal
  volatility: number;  // emotional swing; scandal- and breakdown-prone
  openness: number;    // collaboration & genre experimentation
  workEthic: number;   // output cadence and professional reliability
  warmth: number;      // likeability; forms friendships and romances
  pettiness: number;   // holds grudges; escalates instead of forgiving
}

// ─── Reputation ─────────────────────────────────────────────────────────────
// Five independent public-perception axes (0-100). Opportunities, fan
// reactions and media coverage all read these separately.
export interface ReputationDimensions {
  talent: number;          // perceived musical ability
  authenticity: number;    // perceived realness / lack of industry-plant vibe
  professionalism: number; // reliability; labels & collaborators care most
  marketability: number;   // commercial/brand appeal
  influence: number;       // cultural weight; ability to move trends & people
}

// ─── Relationships ──────────────────────────────────────────────────────────
// Each relationship tracks six *independent* feelings so love/hate can be
// complicated (you can respect a rival you resent, etc.).
export interface RelationshipDimensions {
  friendship: number;  // -100..100
  trust: number;       // -100..100
  respect: number;     // -100..100
  attraction: number;  // -100..100
  resentment: number;  //    0..100
  rivalry: number;     //    0..100
}

export type RelationshipStatus =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close-friend'
  | 'collaborator'
  | 'rival'
  | 'enemy'
  | 'dating'
  | 'ex'
  | 'mentor'
  | 'protege';

export interface NpcRelationship {
  targetId: string;
  status: RelationshipStatus;   // derived from dims after every change
  dims: RelationshipDimensions;
  sinceWeek: number;
  lastInteractionWeek: number;
  history: string[];            // short beat tags, capped — "they feel alive"
}

// ─── Goals ──────────────────────────────────────────────────────────────────
export type GoalKind =
  | 'go-viral'
  | 'sign-deal'
  | 'win-award'
  | 'top-charts'
  | 'find-love'
  | 'start-beef'
  | 'reinvent'
  | 'go-on-tour'
  | 'collaborate'
  | 'expand-empire'
  | 'stay-relevant'
  | 'recover';

export interface NpcGoal {
  kind: GoalKind;
  priority: number;        // 0-100, drives which actions the NPC favors
  progress: number;        // 0-100, complete at 100
  targetId?: string;       // an NPC this goal is about (rival, crush, label…)
  deadlineWeek?: number;   // optional; missing it can cause frustration
}

// ─── Finances / Health / Social ─────────────────────────────────────────────
export interface NpcFinances {
  netWorth: number;
  weeklyIncome: number;
  weeklyBurn: number;
  inDebt: boolean;
}

export interface NpcHealth {
  physical: number;    // 0-100
  mental: number;      // 0-100
  burnout: number;     // 0-100 accumulated exhaustion
  addiction: number;   // 0-100 risk/severity
  inTreatment: boolean;
}

export interface NpcSocial {
  followers: number;
  weeklyPostRate: number;  // posting cadence (posts/week)
  engagement: number;      // 0-100 average engagement quality
  lastPostWeek: number;
  controversyHeat: number; // 0-100 current outrage attached to them
}

/**
 * Role-specific fields. Kept optional in one bag so the core `Npc` shape is
 * uniform for the simulation loop. Only the fields relevant to `Npc.role`
 * are populated by generation.
 */
export interface NpcRoleData {
  // artist / producer
  fans?: number;
  catalogSize?: number;     // releases shipped to date
  lastReleaseWeek?: number;
  // label
  roster?: string[];        // signed artist ids
  budget?: number;
  signingAppetite?: number; // 0-100 how aggressively they sign
  // journalist
  outlet?: string;
  bias?: number;            // -100 hostile .. +100 favorable baseline slant
  // fan-community
  patronId?: string;        // the artist this community stans
  fervor?: number;          // 0-100 intensity of devotion
}

export interface Npc {
  id: string;
  name: string;
  handle: string;
  role: NpcRole;
  stage: CareerStage;
  genre: MusicGenre | null;        // null for non-musical roles (journalist/label)
  personality: PersonalityTraits;
  reputation: ReputationDimensions;
  relationships: Record<string, NpcRelationship>; // sparse, keyed by target id
  goals: NpcGoal[];
  finances: NpcFinances;
  health: NpcHealth;
  social: NpcSocial;
  roleData: NpcRoleData;
  momentum: number;                // -100..100 career trajectory this season
  bornWeek: number;                // week added to the world (<=0 = pre-history)
  active: boolean;                 // false once retired / defunct
  tags: string[];                  // emergent flags: 'on-tour','in-scandal',…
  cooldowns: Record<string, number>; // eventDefId -> week it last fired
}

// ─── World events ───────────────────────────────────────────────────────────
export type WorldEventType =
  | 'debut'
  | 'release'
  | 'viral-moment'
  | 'collaboration'
  | 'feud-started'
  | 'diss-track'
  | 'reconciliation'
  | 'romance-started'
  | 'breakup'
  | 'deal-signed'
  | 'deal-dropped'
  | 'tour-announced'
  | 'scandal'
  | 'award'
  | 'lawsuit'
  | 'mental-crisis'
  | 'comeback'
  | 'retirement';

/** A thing that happened in the world this week. Newsworthy, shareable. */
export interface WorldEvent {
  id: string;
  week: number;
  type: WorldEventType;
  primaryId: string;            // the NPC the event centers on
  secondaryId: string | null;   // the other party, if any
  headline: string;             // generated, human-readable
  magnitude: number;            // 0-100 newsworthiness / reach
  tags: string[];
}

export interface WorldState {
  seed: number;
  week: number;
  npcs: Record<string, Npc>;
  npcIds: string[];      // stable iteration order (append-only)
  events: WorldEvent[];  // rolling capped log, newest first
  eventCount: number;    // lifetime counter, used to mint stable event ids
  retiredCount: number;
}

// ─── Generation config ──────────────────────────────────────────────────────
export interface WorldGenConfig {
  artists: number;
  influencers: number;
  journalists: number;
  labels: number;
  producers: number;
  fanCommunities: number;
}
