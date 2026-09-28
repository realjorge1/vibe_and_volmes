import type { MusicGenre } from './player';

export type RelationshipType =
  | 'rival'
  | 'collaborator'
  | 'ally'
  | 'enemy'
  | 'neutral'
  | 'mentor';

export type ArtistAttitude =
  | 'aggressive'
  | 'passive'
  | 'neutral'
  | 'friendly'
  | 'volatile';

export interface RivalArtist {
  id: string;
  name: string;
  genre: MusicGenre;
  attitude: ArtistAttitude;
  fans: number;
  personality: string[];  // trait tags like 'petty', 'clout-chaser', 'authentic'
  bio: string;
  defaultRelationship: RelationshipType;
}

export interface Relationship {
  artistId: string;
  type: RelationshipType;
  affinity: number;        // -100 (enemies) to 100 (best allies)
  eventHistory: string[];  // event IDs that shaped this
  firstMetWeek: number;
}

// ─── Advanced Rivalry System ──────────────────────────────────────────────

export type RivalryActionKind =
  | 'diss-track'
  | 'subtweet'
  | 'steal-producer'
  | 'sabotage-collab'
  | 'spread-rumor'
  | 'award-snipe'
  | 'trend-domination'
  | 'public-praise'   // de-escalation / fake friendship
  | 'olive-branch';

export interface RivalryActionDef {
  id: string;
  kind: RivalryActionKind;
  minIntensity: number;        // rivalry intensity needed to fire
  hostile: boolean;
  summary: string;             // "{rival} dropped a diss track at you"
  // effect on the player when it lands
  reputationDelta: number;
  fanLoyaltyDelta: number;
  mentalHit: number;           // paranoia/anxiety pressure
  intensityDelta: number;      // how much it escalates the rivalry
  spawnsControversy?: boolean;
  socialBeat: string;
}

/**
 * A rival is a living career, not a static record. Updated every
 * simulated week alongside the player.
 */
export interface RivalCareer {
  artistId: string;
  fans: number;
  momentum: number;            // -100..100 their trajectory
  fameLevel: number;
  intensity: number;           // 0-100 how heated the rivalry is
  storylineId: string | null;  // active recurring narrative
  storylineStage: number;      // escalation step within the storyline
  lastActionWeek: number;
  actionsTaken: string[];      // action ids, for history/escalation
  legendary: boolean;          // crossed the threshold into a defining feud
  dormant: boolean;            // rivalry cooled but remembered
}

export interface RivalryStoryline {
  id: string;
  name: string;
  stages: RivalryStorylineStage[];
}

export interface RivalryStorylineStage {
  stage: number;
  trigger: 'intensity_gte' | 'weeks_since_start' | 'player_won' | 'player_lost';
  value: number;
  beat: string;                // narrative line for social/history
  rivalActionId: string | null;
}
