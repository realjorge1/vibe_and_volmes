import type { XpSource } from './progression';
import type { PlayerStats } from './player';

/**
 * Daily scheduling layer types. The plan is a repeating list of activity
 * slots; the away simulation resolves it over capped real-time into a bounded,
 * openly-reported outcome. Nothing here drives the weekly deterministic sim.
 */

export type ActivityId =
  | 'studio'
  | 'songwriting'
  | 'networking'
  | 'promotion'
  | 'rest'
  | 'fitness'
  | 'social'
  | 'press';

/**
 * Per-slot bounded effect ranges. Resolution rolls within these per resolved
 * slot, then the engine clamps the ACCUMULATED totals against PASSIVE_CONFIG
 * caps — so a long absence can never out-earn or out-grind active play.
 */
export interface ActivityEffect {
  /** Passive money earned per slot, [min, max]. */
  earn?: [number, number];
  /** Multiplier on the world's passive fan drift while this is scheduled. */
  fanDriftMult?: number;
  /** Tiny 0-100 stat nudges per slot. */
  stats?: Partial<Record<keyof PlayerStats, [number, number]>>;
  /** Energy delta per slot (rest restores; grind costs a little). */
  energy?: [number, number];
  /** Relationship affinity nudge per slot toward a known artist. */
  affinity?: [number, number];
  /** XP source + per-slot amount range for the dopamine spine. */
  xp?: { source: XpSource; amount: [number, number] };
  /** Relative weight this activity adds to the curiosity-event roll. */
  curiosityWeight?: number;
}

export interface Activity {
  id: ActivityId;
  label: string;
  /** Ionicons glyph name. */
  icon: string;
  /** One-line "what this is". */
  blurb: string;
  /** Plain "what it tends to do" preview shown in the picker. */
  effectHint: string;
  /** Career level required before it can be scheduled. */
  unlockLevel: number;
  effect: ActivityEffect;
  /** Accent color for the slot chip. */
  color: string;
}

export interface DayPlan {
  /** Length = PASSIVE_CONFIG.SLOTS_PER_DAY; null = an unplanned (free) slot. */
  slots: (ActivityId | null)[];
  updatedAt: number;
}

/** A multi-step curiosity arc that advances across resumes. */
export interface Storyline {
  /** Instance id. */
  id: string;
  /** Definition id in data/passive/curiosityEvents. */
  defId: string;
  title: string;
  step: number;
  steps: number;
  /** Real-time (ms) the next step becomes eligible. */
  nextEligibleAt: number;
}

/** A curiosity beat that fired during a resume. */
export interface CuriosityResult {
  id: string;
  headline: string;
  detail?: string;
}

/** What resolving the plan over an absence produced — bounded + reportable. */
export interface PlanOutcome {
  resolvedSlots: number;
  /** Per-activity tallies for the recap, e.g. { studio: 3 }. */
  slotCounts: Partial<Record<ActivityId, number>>;
  earnings: number;
  statChanges: { stat: keyof PlayerStats; delta: number }[];
  energyDelta: number;
  /** Net multiplier applied to the world's passive fan drift. */
  fanDriftMult: number;
  affinityChanges: { artistId: string; name: string; delta: number }[];
  xpGrants: { source: XpSource; amount: number; label: string }[];
  curiosity: CuriosityResult[];
  /** Human-readable per-activity result lines for the recap. */
  planResults: string[];
}

// ── Curiosity / scheduled-event content shapes ────────────────────────────

export interface CuriosityEventDef {
  id: string;
  /** Activities that make this more likely (any match adds weight). */
  favoredBy: ActivityId[];
  weight: number;
  /** Headline templates; `{name}` is replaced with the artist name. */
  headlines: string[];
  /** Bounded one-shot deltas folded into the outcome totals when it fires. */
  effect?: ActivityEffect;
  /** If set, this beat seeds a multi-step storyline. */
  storyline?: { title: string; steps: number; cooldownMs: number };
}

export interface ScheduledEventDef {
  id: string;
  title: string;
  blurb: string;
  /** Which activity capitalizes on the event window. */
  boostActivity: ActivityId;
  /** Recurrence cadence in real days (anchored to the career start). */
  cadenceDays: number;
  /** How many real days the window stays "live". */
  windowDays: number;
}

/** A scheduled event projected against the wall clock for the planner UI. */
export interface UpcomingEvent {
  id: string;
  title: string;
  blurb: string;
  boostActivity: ActivityId;
  /** ms until it starts (<= 0 means it is live now). */
  startsInMs: number;
  /** ms until it ends. */
  endsInMs: number;
  live: boolean;
}
