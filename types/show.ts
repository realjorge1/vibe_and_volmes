import type { PlayerStats } from './player';
import type { MomentSpec } from './drama';

/**
 * A LIVE SHOW: the artist's own songs, played with real audio and live FX.
 * The setlist is the strategy; the cues are the skill; the stage moments are
 * the risk. The result is the night's performance score, which the tour,
 * festival or gig it belongs to pays out on.
 */

export type ShowKind = 'tour' | 'festival' | 'gig';

export interface ShowVenue {
  kind: ShowKind;
  /** Unique per show: a tour stop, a festival year, a gig week. */
  key: string;
  name: string;
  city: string;
  capacity: number;
  /** Expected crowd. */
  crowd: number;
  /** Festival billing, if any. */
  slot?: string;
  /** Songs in the set. */
  setLength: number;
  /** What the night pays on top of the tour/festival economics (gigs). */
  payout: number;
  /** 0..100: how much a great night here matters. */
  prestige: number;
}

export type SongEnergy = 'high' | 'mid' | 'low';

export interface ShowSong {
  trackId: string;
  title: string;
  /** 0..100: how much the crowd knows and wants it. */
  heat: number;
  energy: SongEnergy;
  bpm: number;
  beatId: string | null;
  vocalUri: string | null;
}

export type CueKind = 'drop' | 'filter' | 'echo' | 'drive';

/** A moment in a song the player has to hit. */
export interface Cue {
  kind: CueKind;
  /** Bar (0-based) whose first beat is the target. */
  bar: number;
  prompt: string;
}

export type CueGrade = 'perfect' | 'great' | 'ok' | 'miss';

export interface StageOption {
  id: string;
  label: string;
  /** The stat that decides it. */
  stat: keyof PlayerStats;
  /** Chance of it going wrong at stat 50 (scaled by the stat). */
  risk: number;
  /** Crowd energy when it works / when it doesn't. */
  good: number;
  bad: number;
  goodLine: string;
  badLine: string;
  /** Spawned when it works this well (the clip everybody posts). */
  goodMoment?: MomentSpec;
  badMoment?: MomentSpec;
}

/** Something that happens on stage: a choice in the middle of the set. */
export interface StageMoment {
  id: string;
  prompt: string;
  /** Where in the set it can happen. */
  when: 'any' | 'opener' | 'closer' | 'slow';
  /** Smallest crowd it can happen to. */
  minCrowd?: number;
  options: StageOption[];
}

export interface ShowRecord {
  key: string;
  kind: ShowKind;
  venue: string;
  city: string;
  week: number;
  score: number;
  stars: number;
  setlist: string[];
  highlights: string[];
  review: string;
}

export interface GigBooking {
  week: number;
  venue: string;
  city: string;
  capacity: number;
  payout: number;
  played: boolean;
}
