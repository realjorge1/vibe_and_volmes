import type { GameEvent, EventTrigger, EventChoice } from '../../types/events';
import type { PlayerStats } from '../../types/player';
import type { MentalState } from '../../types/industry';
import type { LifeStageId } from '../../types/life';
import type { Person } from '../../types/people';
import type { EraPersona, Seed } from '../../types/identity';
import { activePeople, partnerOf } from '../life/peopleEngine';
import {
  canCast,
  personalizeEvent,
  type AssetView,
  type LegendView,
  type NewcomerCandidate,
} from './personalize';
import type { HomeId } from '../../types/status';
import { ALL_EVENTS } from '../../data/events';
import { getFameLevelNumber } from '../../utils/statHelpers';
import { EVENTS_PER_WEEK } from '../../constants/gameConfig';
import { weightedPick, chance } from '../../utils/random';
import { seedForTrigger } from '../identity/seedEngine';
import { traitTag } from '../identity/traitTags';

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
  /** The hottest rival, for `{rival}` in event text. */
  rival?: { id: string; name: string } | null;
  // ─── Identity, the year, the law, legacy, business (optional so older
  //     callers and tests that build partial contexts keep working) ───
  seeds?: Seed[];
  /** Where a world NPC's career is now (for seeds about them). */
  npcStageOf?: (npcId: string) => string | undefined;
  yearWeek?: number;
  careerYear?: number;
  inJail?: boolean;
  /** A charge is waiting on a lawyer. */
  casePending?: boolean;
  /** The charge, for `{charge}`. */
  chargeLabel?: string | null;
  eraPersona?: EraPersona | null;
  comebackActive?: boolean;
  /** Past lives alive / gone in this world, for `{legend}`. */
  legends?: { alive: LegendView[]; dead: LegendView[] };
  ownsLabel?: boolean;
  labelName?: string | null;
  /** Active signees, for `{signee}`. */
  signees?: { npcId: string; name: string; stage: string }[];
  labelOwnsMasters?: boolean;
  /** What buying the masters back costs right now, for `{mastersPrice}`. */
  mastersPrice?: number;
  /** The artist's stage name, for `{playerName}`. */
  playerName?: string;
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
    // ─── Identity ───
    case 'has_trait':
      return !!trigger.trait && ctx.tags.includes(traitTag(trigger.trait));
    case 'lacks_trait':
      return !!trigger.trait && !ctx.tags.includes(traitTag(trigger.trait));
    case 'seed_ripe':
      return (
        seedForTrigger(trigger, ctx.seeds ?? [], ctx.week, ctx.npcStageOf ?? (() => undefined)) !== null
      );
    case 'era_persona':
      return !!ctx.eraPersona && ctx.eraPersona === trigger.persona;
    case 'comeback_active':
      return !!ctx.comebackActive;
    // ─── The music year ───
    case 'year_week':
      return ctx.yearWeek === trigger.value;
    case 'career_year_gte':
      return (ctx.careerYear ?? 1) >= (trigger.value ?? 0);
    // ─── The law ───
    case 'in_jail':
      return !!ctx.inJail;
    case 'not_in_jail':
      return !ctx.inJail;
    case 'case_pending':
      return !!ctx.casePending;
    // ─── Legacy & business ───
    case 'has_legend': {
      const alive = ctx.legends?.alive.length ?? 0;
      const dead = ctx.legends?.dead.length ?? 0;
      if (trigger.legend === 'alive') return alive > 0;
      if (trigger.legend === 'dead') return dead > 0;
      return alive + dead > 0;
    }
    case 'owns_label':
      return !!ctx.ownsLabel;
    case 'has_signee':
      return (ctx.signees?.length ?? 0) > 0;
    case 'label_owns_masters':
      return !!ctx.labelOwnsMasters;
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

/** Events that can happen behind bars (they carry an `in_jail` trigger). */
function isJailEvent(event: GameEvent): boolean {
  return event.triggers.some((t) => t.type === 'in_jail');
}

export function isEventEligible(event: GameEvent, ctx: EventContext): boolean {
  if (event.unique && ctx.eventHistory.includes(event.id)) return false;
  if (!passesCooldown(event, ctx)) return false;
  // Inside, the outside world's events don't reach the artist.
  if (ctx.inJail && !isJailEvent(event)) return false;
  // Text that names a person or a thing needs one to name.
  if (!canCast(event, ctx)) return false;
  return event.triggers.every((t) => checkTrigger(t, ctx));
}

export function getEligibleEvents(ctx: EventContext): GameEvent[] {
  return ALL_EVENTS.filter((e) => isEventEligible(e, ctx));
}

/**
 * Choices the artist can take: required tags held. Choices that need a trait
 * the artist doesn't have are hidden entirely (see `hiddenByTrait`).
 */
export function getAvailableChoices(
  event: GameEvent,
  tags: string[]
): EventChoice[] {
  return event.choices.filter(
    (c) =>
      (!c.requiresTags || c.requiresTags.every((t) => tags.includes(t))) &&
      (!c.requiresTrait || tags.includes(traitTag(c.requiresTrait)))
  );
}

/** A trait-gated choice the artist can't see (not shown as locked). */
export function hiddenByTrait(choice: EventChoice, tags: string[]): boolean {
  return !!choice.requiresTrait && !tags.includes(traitTag(choice.requiresTrait));
}

/** Most priority events (court dates, callbacks, the calendar) in one week. */
const MAX_PRIORITY = 2;

/**
 * Build the slate of events for a week. Count scales with fame.
 * Priority events (the past coming back, the law, the calendar) are slated
 * first; the rest prefer category diversity, never repeating in a slate.
 */
export function generateWeekEvents(ctx: EventContext): GameEvent[] {
  const fameLevel = getFameLevelNumber(ctx.stats.fans);
  const count = Math.max(EVENTS_PER_WEEK[fameLevel] ?? 1, ctx.inJail ? 1 : 0);

  const pool = getEligibleEvents(ctx);
  if (pool.length === 0) return [];

  const selected: GameEvent[] = [];
  const usedCategories = new Set<string>();
  const usedSeeds = new Set<string>();
  let candidates = [...pool];

  // Callbacks bind a seed each; two callbacks for one seed would be one story
  // told twice, so a seed already claimed this slate rules out the rest.
  const seedOf = (e: GameEvent): string | null => {
    const t = e.triggers.find((tr) => tr.type === 'seed_ripe');
    if (!t) return null;
    const seed = seedForTrigger(t, ctx.seeds ?? [], ctx.week, ctx.npcStageOf ?? (() => undefined));
    return seed?.id ?? null;
  };

  const priority = candidates.filter((e) => e.priority);
  for (let i = 0; i < MAX_PRIORITY && selected.length < count + 1 && priority.length > 0; i++) {
    const picked = weightedPick(priority);
    if (!picked) break;
    priority.splice(priority.indexOf(picked), 1);
    const seedId = seedOf(picked);
    if (seedId && usedSeeds.has(seedId)) continue;
    if (seedId) usedSeeds.add(seedId);
    selected.push(picked);
    usedCategories.add(picked.category);
    candidates = candidates.filter((e) => e.id !== picked.id);
  }

  while (selected.length < count && candidates.length > 0) {
    const fresh = candidates.filter((e) => !usedCategories.has(e.category));
    const picked = weightedPick(fresh.length > 0 ? fresh : candidates) ?? null;
    if (!picked) break;
    candidates = candidates.filter((e) => e.id !== picked.id);
    const seedId = seedOf(picked);
    if (seedId && usedSeeds.has(seedId)) continue;
    if (seedId) usedSeeds.add(seedId);
    selected.push(picked);
    usedCategories.add(picked.category);
  }

  // Fill in the people each event talks about, once, as it is slated.
  return selected.map((e) => personalizeEvent(e, ctx));
}
