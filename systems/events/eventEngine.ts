import type { GameEvent, EventTrigger, EventChoice } from '../../types/events';
import type { PlayerStats } from '../../types/player';
import type { MentalState } from '../../types/industry';
import type { LifeStageId } from '../../types/life';
import type { Person } from '../../types/people';
import { activePeople, partnerOf } from '../life/peopleEngine';
import {
  canCast,
  personalizeEvent,
  type AssetView,
  type NewcomerCandidate,
} from './personalize';
import type { HomeId } from '../../types/status';
import { ALL_EVENTS } from '../../data/events';
import { getFameLevelNumber } from '../../utils/statHelpers';
import { EVENTS_PER_WEEK } from '../../constants/gameConfig';
import { weightedPick, chance } from '../../utils/random';

export interface EventContext {
  stats: PlayerStats;
  week: number;
  tags: string[];
  hasReleasedTrack: boolean;
  eventHistory: string[];
  eventCooldowns: Record<string, number>;
  // ─── Phase 3 context ───
  hasContract: boolean;
  onTour: boolean;
  controversyActive: boolean;
  careerPhase: string;
  mental: MentalState;
  rivalryIntensity: number;
  // ─── Phase 5 culture context ───
  eraId: string;
  genreSaturated: boolean;
  genreAscendant: boolean;
  // ─── Life context ───
  age: number;
  lifeStage: LifeStageId;
  /** The artist's people (estranged included; the triggers skip them). */
  people: Person[];
  /** Strangers an event can introduce as `{new}` (unlinked world NPCs). */
  newcomers: NewcomerCandidate[];
  // ─── Assets context ───
  assets: AssetView[];
  homeId: HomeId;
  /** Lowercase, e.g. "your penthouse". */
  homeTitle: string;
  money: number;
}

export function checkTrigger(trigger: EventTrigger, ctx: EventContext): boolean {
  switch (trigger.type) {
    case 'always':
      return true;
    case 'random':
      return chance(trigger.value ?? 0.5);
    case 'week_gte':
      return ctx.week >= (trigger.value ?? 0);
    case 'fans_gte':
      return ctx.stats.fans >= (trigger.value ?? 0);
    case 'fans_lte':
      return ctx.stats.fans <= (trigger.value ?? 0);
    case 'stat_gte':
      return trigger.stat
        ? (ctx.stats[trigger.stat] as number) >= (trigger.value ?? 0)
        : false;
    case 'stat_lte':
      return trigger.stat
        ? (ctx.stats[trigger.stat] as number) <= (trigger.value ?? 0)
        : false;
    case 'has_tag':
      return trigger.tag ? ctx.tags.includes(trigger.tag) : false;
    case 'lacks_tag':
      return trigger.tag ? !ctx.tags.includes(trigger.tag) : false;
    case 'has_released_track':
      return ctx.hasReleasedTrack;
    case 'has_contract':
      return ctx.hasContract;
    case 'lacks_contract':
      return !ctx.hasContract;
    case 'on_tour':
      return ctx.onTour;
    case 'controversy_active':
      return ctx.controversyActive;
    case 'no_controversy':
      return !ctx.controversyActive;
    case 'career_phase':
      return ctx.careerPhase === trigger.phase;
    case 'mental_gte':
      return trigger.mentalAxis
        ? (ctx.mental[trigger.mentalAxis] as number) >= (trigger.value ?? 0)
        : false;
    case 'mental_lte':
      return trigger.mentalAxis
        ? (ctx.mental[trigger.mentalAxis] as number) <= (trigger.value ?? 0)
        : false;
    case 'rivalry_intensity_gte':
      return ctx.rivalryIntensity >= (trigger.value ?? 0);
    case 'era_is':
      return ctx.eraId === trigger.era;
    case 'genre_saturated':
      return ctx.genreSaturated;
    case 'genre_ascendant':
      return ctx.genreAscendant;
    case 'age_gte':
      return ctx.age >= (trigger.value ?? 0);
    case 'age_lte':
      return ctx.age <= (trigger.value ?? Number.POSITIVE_INFINITY);
    case 'life_stage':
      return ctx.lifeStage === trigger.lifeStage;
    case 'has_partner': {
      const partner = partnerOf(activePeople(ctx.people));
      return !!partner && (!trigger.bond || partner.bond === trigger.bond);
    }
    case 'has_child':
      return activePeople(ctx.people).some((p) => p.role === 'child');
    case 'has_person':
      return activePeople(ctx.people).some((p) => p.role === trigger.role);
    case 'lacks_person':
      return !activePeople(ctx.people).some((p) => p.role === trigger.role);
    case 'person_affinity_lte':
      return activePeople(ctx.people).some(
        (p) => p.role === trigger.role && p.affinity <= (trigger.value ?? 0)
      );
    case 'person_affinity_gte':
      return activePeople(ctx.people).some(
        (p) => p.role === trigger.role && p.affinity >= (trigger.value ?? 0)
      );
    case 'owns_asset':
      return ctx.assets.some(
        (a) =>
          (!trigger.asset || a.itemId === trigger.asset) &&
          (!trigger.assetCategory || a.category === trigger.assetCategory)
      );
    case 'lacks_asset':
      return !ctx.assets.some((a) => a.itemId === trigger.asset);
    case 'home_is':
      return ctx.homeId === trigger.home;
    case 'money_lte':
      return ctx.money <= (trigger.value ?? 0);
    default:
      return false;
  }
}

function passesCooldown(event: GameEvent, ctx: EventContext): boolean {
  const lastFired = ctx.eventCooldowns[event.id];
  if (lastFired === undefined) return true;
  const cd = event.cooldown ?? 0;
  return ctx.week - lastFired >= cd;
}

export function isEventEligible(event: GameEvent, ctx: EventContext): boolean {
  if (event.unique && ctx.eventHistory.includes(event.id)) return false;
  if (!passesCooldown(event, ctx)) return false;
  // Text that names a person or a thing needs one to name.
  if (!canCast(event, ctx)) return false;
  return event.triggers.every((t) => checkTrigger(t, ctx));
}

export function getEligibleEvents(ctx: EventContext): GameEvent[] {
  return ALL_EVENTS.filter((e) => isEventEligible(e, ctx));
}

/** Choices whose required tags the player currently holds. */
export function getAvailableChoices(
  event: GameEvent,
  tags: string[]
): EventChoice[] {
  return event.choices.filter(
    (c) => !c.requiresTags || c.requiresTags.every((t) => tags.includes(t))
  );
}

/**
 * Build the slate of events for a week. Count scales with fame.
 * Prefers category diversity and never repeats an event within the slate.
 */
export function generateWeekEvents(ctx: EventContext): GameEvent[] {
  const fameLevel = getFameLevelNumber(ctx.stats.fans);
  const count = EVENTS_PER_WEEK[fameLevel] ?? 1;

  const pool = getEligibleEvents(ctx);
  if (pool.length === 0) return [];

  const selected: GameEvent[] = [];
  const usedCategories = new Set<string>();
  let candidates = [...pool];

  for (let i = 0; i < count && candidates.length > 0; i++) {
    const fresh = candidates.filter((e) => !usedCategories.has(e.category));
    const picked =
      weightedPick(fresh.length > 0 ? fresh : candidates) ?? null;
    if (!picked) break;

    selected.push(picked);
    usedCategories.add(picked.category);
    candidates = candidates.filter((e) => e.id !== picked.id);
  }

  // Fill in the people each event talks about, once, as it is slated.
  return selected.map((e) => personalizeEvent(e, ctx));
}
