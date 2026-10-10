import type { EventConsequence } from '../../types/events';
import type { PlayerStats } from '../../types/player';
import type { StoryBeat } from '../../types/social';
import type { ActivityCategory, ActivityOutcome, LifeActivity } from '../../types/life';
import { CAREER_STAGES, type CareerStageId } from '../../constants/careerStages';
import {
  ACTIVITIES_PER_WEEK,
  ACTIVITY_EARNINGS_CAP_PER_WEEK,
} from '../../constants/gameConfig';

/**
 * Activities engine. Pure: given an activity and a snapshot of the artist,
 * say whether it can be done and resolve it to one outcome. Applying the
 * result (energy, money, stats, the Deck line, the feed) is the action
 * layer's job — see `playerDoActivity` in systems/simulation/playerActions.
 */

export interface ActivityContext {
  week: number;
  age: number;
  level: number;
  careerStage: CareerStageId;
  stats: PlayerStats;
  money: number;
  tags: string[];
  hasRival: boolean;
  hasPartner: boolean;
  /** Activities already done this week. */
  doneThisWeek: number;
  /** Gross money already earned from activities this week. */
  earnedThisWeek: number;
  /** activityId → week it was last done. */
  lastDone: Record<string, number>;
  // ─── Who the artist is, and where (optional: older callers omit them) ───
  /** Locked up: only `jail` activities exist. */
  inJail?: boolean;
  /** Trait tilt per category, in skill points. */
  activityTilt?: Partial<Record<ActivityCategory, number>>;
  /** Extra activities a week (a Workaholic). */
  extraActivities?: number;
  /** Multiplier on outcomes that end in a charge (a Hothead). */
  arrestRisk?: number;
}

/** Activities per week for this artist. */
export function activitiesPerWeek(ctx: Pick<ActivityContext, 'extraActivities'>): number {
  return ACTIVITIES_PER_WEEK + (ctx.extraActivities ?? 0);
}

export type Availability =
  | { ok: true }
  /** `locked`: a gate the artist can't meet yet (vs. out of energy/time/cash). */
  | { ok: false; locked: boolean; reason: string };

function stageIndex(id: CareerStageId): number {
  return CAREER_STAGES.findIndex((s) => s.id === id);
}

function stageLabel(id: CareerStageId): string {
  return CAREER_STAGES.find((s) => s.id === id)?.label ?? id;
}

/** Gates first (locked), then this week's resources. */
export function activityAvailability(
  activity: LifeActivity,
  ctx: ActivityContext
): Availability {
  const g = activity.gates ?? {};
  const locked = (reason: string): Availability => ({ ok: false, locked: true, reason });
  if (activity.category === 'jail' && !ctx.inJail) return locked('Only inside');
  if (activity.category !== 'jail' && ctx.inJail) return locked('Not from in here');
  if (g.minAge !== undefined && ctx.age < g.minAge) return locked(`Age ${g.minAge}+`);
  if (g.maxAge !== undefined && ctx.age > g.maxAge) return locked(`Under ${g.maxAge + 1} only`);
  if (g.minStage && stageIndex(ctx.careerStage) < stageIndex(g.minStage)) {
    return locked(`${stageLabel(g.minStage)} stage`);
  }
  if (g.minLevel !== undefined && ctx.level < g.minLevel) return locked(`Level ${g.minLevel}`);
  if (g.minFans !== undefined && ctx.stats.fans < g.minFans) {
    return locked(`${g.minFans.toLocaleString('en-US')} fans`);
  }
  if (g.requiresTag && !ctx.tags.includes(g.requiresTag)) return locked('Not available to you');
  if (g.lacksTag && ctx.tags.includes(g.lacksTag)) return locked('Not available to you');
  if (g.requiresRival && !ctx.hasRival) return locked('Needs a rival');
  if (g.single && ctx.hasPartner) return locked('You are seeing someone');

  const busy = (reason: string): Availability => ({ ok: false, locked: false, reason });
  if (ctx.doneThisWeek >= activitiesPerWeek(ctx)) return busy('No time left this week');
  const last = ctx.lastDone[activity.id];
  if (activity.cooldownWeeks && last !== undefined) {
    const wait = last + activity.cooldownWeeks - ctx.week;
    if (wait > 0) return busy(`Again in ${wait} week${wait > 1 ? 's' : ''}`);
  }
  if (ctx.stats.energy < activity.energyCost) return busy('Too tired');
  if ((activity.moneyCost ?? 0) > ctx.money) {
    return busy(`Needs $${(activity.moneyCost ?? 0).toLocaleString('en-US')}`);
  }
  return { ok: true };
}

/**
 * Outcome weight after the skill tilt: at skill 0 good outcomes are 0.4× as
 * likely and bad ones 1.6×; at skill 100 it flips. Unmarked outcomes are luck.
 */
export function effectiveWeight(
  outcome: ActivityOutcome,
  activity: LifeActivity,
  stats: PlayerStats,
  mods: OutcomeMods = {}
): number {
  let w = outcome.weight;
  if (activity.skill && outcome.luck) {
    const s = Math.max(0, Math.min(100, stats[activity.skill] as number)) / 100;
    w *= outcome.luck === 'good' ? 0.4 + 1.2 * s : 1.6 - 1.2 * s;
  }
  // A personality that suits the activity tilts luck its way.
  const tilt = mods.tilt ?? 0;
  if (tilt && outcome.luck) {
    w *= Math.max(0.2, outcome.luck === 'good' ? 1 + tilt / 100 : 1 - tilt / 100);
  }
  if (outcome.consequences.legalCharge) w *= mods.arrestRisk ?? 1;
  return w;
}

/** Who the artist is, as it bends an activity's luck. */
export interface OutcomeMods {
  /** Skill points from traits for this activity's category. */
  tilt?: number;
  arrestRisk?: number;
}

export function pickOutcome(
  activity: LifeActivity,
  stats: PlayerStats,
  rng: () => number = Math.random,
  mods: OutcomeMods = {}
): ActivityOutcome {
  const weights = activity.outcomes.map((o) => effectiveWeight(o, activity, stats, mods));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < activity.outcomes.length; i++) {
    roll -= weights[i];
    if (roll < 0) return activity.outcomes[i];
  }
  return activity.outcomes[activity.outcomes.length - 1];
}

export interface Tokens {
  playerName: string;
  /** Who `{npc}` names (a world NPC or the rival). */
  npc: string;
}

export function fillTokens(text: string, t: Tokens): string {
  return text.replace(/\{playerName\}/g, t.playerName).replace(/\{npc\}/g, t.npc);
}

/** A hashtag is one word: strip spaces and punctuation from filled tokens. */
function toHashtag(text: string): string {
  return text.replace(/[^A-Za-z0-9]/g, '');
}

export interface ActivityResult {
  activity: LifeActivity;
  outcome: ActivityOutcome;
  /**
   * What to apply, ready for `applyConsequence`: tokens filled, earnings
   * capped, and the activity's money cost folded into `moneyDelta`.
   */
  consequences: EventConsequence;
  /** Gross money this outcome earned, after the weekly cap. */
  earned: number;
  /** The story line for the Deck (= consequences.flavorText). */
  line: string;
  /** Filled feed post, when the outcome is dramatic enough for one. */
  social: StoryBeat | null;
}

export function resolveActivity(
  activity: LifeActivity,
  ctx: ActivityContext,
  tokens: Tokens,
  rng: () => number = Math.random
): ActivityResult {
  const outcome = pickOutcome(activity, ctx.stats, rng, {
    tilt: ctx.activityTilt?.[activity.category],
    arrestRisk: ctx.arrestRisk,
  });
  const c = outcome.consequences;

  const gross = c.moneyDelta ?? 0;
  const capLeft = Math.max(0, ACTIVITY_EARNINGS_CAP_PER_WEEK - ctx.earnedThisWeek);
  const earned = gross > 0 ? Math.min(gross, capLeft) : 0;
  const moneyDelta = (gross > 0 ? earned : gross) - (activity.moneyCost ?? 0);

  const line = fillTokens(c.flavorText, tokens);
  const consequences: EventConsequence = {
    ...c,
    moneyDelta: moneyDelta || undefined,
    flavorText: line,
    historyRecord: c.historyRecord && {
      ...c.historyRecord,
      summary: fillTokens(c.historyRecord.summary, tokens),
    },
    // A seed about whoever `{npc}` was tonight (their world id is bound by
    // the action layer, which knows who they are).
    plantSeed: c.plantSeed && {
      ...c.plantSeed,
      note: fillTokens(c.plantSeed.note, tokens),
      name: c.plantSeed.who === 'npc' || c.plantSeed.who === 'rival' ? tokens.npc : c.plantSeed.name,
    },
  };

  const social = outcome.social
    ? {
        ...outcome.social,
        text: fillTokens(outcome.social.text, tokens),
        trend: outcome.social.trend && toHashtag(fillTokens(outcome.social.trend, tokens)),
      }
    : null;

  return { activity, outcome, consequences, earned, line, social };
}
