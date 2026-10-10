import type { MusicGenre, PlayerStats } from './player';

/**
 * THE MOGUL. Past a point the artist stops being only an artist: a label of
 * their own with real artists from the living world on it, and businesses
 * with their name on the door. All of it pays (or bleeds) into the one
 * economy, week by week.
 */

export interface OwnLabel {
  name: string;
  color: string;
  foundedWeek: number;
  /** 0..100: what the industry thinks of it. */
  reputation: number;
  /** Lifetime money the roster made for the label. */
  earned: number;
}

export type SigneeStatus = 'active' | 'left' | 'dropped';

export interface Signee {
  npcId: string;
  name: string;
  genre: MusicGenre | null;
  signedWeek: number;
  advance: number;
  /** The label's cut of what they earn, 0..1. */
  share: number;
  /** -100..100: drops when they outgrow the deal or feel ignored. */
  loyalty: number;
  status: SigneeStatus;
  startFollowers: number;
  /** Lifetime money they made the label. */
  earned: number;
  lastPushWeek: number | null;
  /** Their career stage when last seen, for "they made it" beats. */
  lastStage: string;
}

export interface VentureDef {
  id: string;
  label: string;
  blurb: string;
  icon: string;
  color: string;
  cost: number;
  /** Weekly net at full health for a mid-fame owner. */
  baseIncome: number;
  /** 0..1: how hard health swings week to week. */
  volatility: number;
  minFans: number;
  minLevel: number;
  /** The stat that keeps it healthy. */
  stat: keyof PlayerStats;
  /** Weekly fixed cost, paid even when it fails. */
  upkeep: number;
}

export type VentureStatus = 'running' | 'closed';

export interface Venture {
  id: string;
  defId: string;
  startedWeek: number;
  invested: number;
  /** 0..100. Below 15 for a while and it folds. */
  health: number;
  lifetimeNet: number;
  lastNet: number;
  status: VentureStatus;
  /** Weeks spent in the red zone. */
  badWeeks: number;
}
