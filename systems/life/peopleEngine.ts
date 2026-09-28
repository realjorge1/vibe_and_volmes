import type {
  FamilyTemplate,
  InteractionEffect,
  InteractionOutcome,
  Person,
  PersonInteraction,
  PersonRole,
} from '../../types/people';
import type { EventConsequence } from '../../types/events';
import type { StoryBeat } from '../../types/social';
import {
  ALLOWANCE_MIN_AFFINITY,
  ALLOWANCE_STOPS_AT,
  NEGLECT,
  PEOPLE_MONEY_CAP_PER_WEEK,
  SUPPORTIVE_FLOOR,
  WEEKS_PER_YEAR,
} from '../../constants/gameConfig';
import { FIRST_NAMES } from '../../data/life/names';

/**
 * People engine. Pure: family generation, interactions, and the weekly
 * drift of every relationship. The store and the action layer apply what
 * these return.
 */

export const AFFINITY_MIN = -100;
export const AFFINITY_MAX = 100;

export function clampAffinity(n: number): number {
  return Math.max(AFFINITY_MIN, Math.min(AFFINITY_MAX, Math.round(n)));
}

let idCounter = 0;
export function newPersonId(): string {
  idCounter += 1;
  return `person-${Date.now().toString(36)}-${idCounter}`;
}

export function isEstranged(p: Person): boolean {
  return p.traits.includes('estranged');
}

/** People who can appear in stories and be interacted with. */
export function activePeople(people: Person[]): Person[] {
  return people.filter((p) => !isEstranged(p));
}

export function partnerOf(people: Person[]): Person | undefined {
  return people.find((p) => p.role === 'partner');
}

export function childAge(p: Person, week: number): number {
  return Math.max(0, Math.floor((week - (p.bornWeek ?? week)) / WEEKS_PER_YEAR));
}

/** "your mom" → "Your mom". */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Family ─────────────────────────────────────────────────────────────────

export function surnameOf(realName: string): string {
  const parts = realName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function generateFamily(
  template: FamilyTemplate,
  week: number,
  rng: () => number = Math.random
): { people: Person[]; intro: string } {
  const used = new Set<string>();
  const people = template.members.map((m) => {
    let name = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    for (let i = 0; used.has(name) && i < FIRST_NAMES.length; i++) {
      name = FIRST_NAMES[(FIRST_NAMES.indexOf(name) + 1) % FIRST_NAMES.length];
    }
    used.add(name);
    const person: Person = {
      id: newPersonId(),
      name,
      role: m.role,
      title: m.title,
      affinity: m.affinity,
      traits: [...m.traits],
      sinceWeek: 0,
      lastSeenWeek: week,
    };
    if (m.allowance) person.allowance = m.allowance;
    return person;
  });
  const intro = people.reduce((text, p, i) => text.replace(`{${i + 1}}`, p.name), template.intro);
  return { people, intro };
}

// ─── Interactions ───────────────────────────────────────────────────────────

export interface InteractionContext {
  week: number;
  /** The artist's age. */
  age: number;
  energy: number;
  money: number;
  /** Money the artist's people already gave this week (for the cap). */
  giftedThisWeek: number;
  /** A baby is already on the way. */
  expecting: boolean;
}

export type InteractionAvailability = { ok: true } | { ok: false; reason: string };

export function interactionAvailability(
  interaction: PersonInteraction,
  person: Person,
  ctx: InteractionContext
): InteractionAvailability {
  const no = (reason: string): InteractionAvailability => ({ ok: false, reason });
  if (!interaction.roles.includes(person.role)) return no('Not with them');
  const r = interaction.requires ?? {};
  if (isEstranged(person) && interaction.id !== 'apologize') return no('You cut them off');
  if (r.bond && (!person.bond || !r.bond.includes(person.bond))) return no('Not right now');
  if (r.npcLinked && !person.npcId) return no('They are not in the industry');
  if (r.minAffinity !== undefined && person.affinity < r.minAffinity) return no('They are not close enough');
  if (r.maxAffinity !== undefined && person.affinity > r.maxAffinity) return no('No need');
  if (r.minChildAge !== undefined && childAge(person, ctx.week) < r.minChildAge) {
    return no(`When they are ${r.minChildAge}`);
  }
  if (interaction.minAge !== undefined && ctx.age < interaction.minAge) {
    return no(`Age ${interaction.minAge}+`);
  }
  if (person.lastInteractionWeek === ctx.week) return no('Already saw them this week');
  if (ctx.expecting && interaction.outcomes.some((o) => o.effect === 'conceive')) {
    return no('A baby is already on the way');
  }
  if (ctx.energy < interaction.energyCost) return no('Too tired');
  if ((interaction.moneyCost ?? 0) > ctx.money) {
    return no(`Needs $${(interaction.moneyCost ?? 0).toLocaleString('en-US')}`);
  }
  return { ok: true };
}

/** Affinity tilts outcomes the way a skill does for activities. */
export function interactionWeight(outcome: InteractionOutcome, person: Person): number {
  if (!outcome.luck) return outcome.weight;
  const a = (clampAffinity(person.affinity) - AFFINITY_MIN) / (AFFINITY_MAX - AFFINITY_MIN);
  const tilt = outcome.luck === 'good' ? 0.4 + 1.2 * a : 1.6 - 1.2 * a;
  return outcome.weight * tilt;
}

export function pickInteractionOutcome(
  interaction: PersonInteraction,
  person: Person,
  rng: () => number = Math.random
): InteractionOutcome {
  const weights = interaction.outcomes.map((o) => interactionWeight(o, person));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < interaction.outcomes.length; i++) {
    roll -= weights[i];
    if (roll < 0) return interaction.outcomes[i];
  }
  return interaction.outcomes[interaction.outcomes.length - 1];
}

export function fillPersonTokens(text: string, person: Person, playerName: string): string {
  return text
    .replace(/\{name\}/g, person.name)
    .replace(/\{title\}/g, person.title)
    .replace(/\{Title\}/g, capitalize(person.title))
    .replace(/\{playerName\}/g, playerName);
}

export interface InteractionResult {
  outcome: InteractionOutcome;
  consequences: EventConsequence;
  affinityDelta: number;
  effect: InteractionEffect | null;
  addTrait: string | null;
  /** Money this person handed over, after the weekly cap. */
  gifted: number;
  line: string;
  social: StoryBeat | null;
}

export function resolveInteraction(
  interaction: PersonInteraction,
  person: Person,
  ctx: InteractionContext,
  playerName: string,
  rng: () => number = Math.random
): InteractionResult {
  const outcome = pickInteractionOutcome(interaction, person, rng);
  const c = outcome.consequences;
  const fill = (t: string) => fillPersonTokens(t, person, playerName);

  const gross = c.moneyDelta ?? 0;
  const capLeft = Math.max(0, PEOPLE_MONEY_CAP_PER_WEEK - ctx.giftedThisWeek);
  const gifted = gross > 0 ? Math.min(gross, capLeft) : 0;
  const moneyDelta = (gross > 0 ? gifted : gross) - (interaction.moneyCost ?? 0);

  const line = fill(c.flavorText);
  return {
    outcome,
    consequences: {
      ...c,
      moneyDelta: moneyDelta || undefined,
      flavorText: line,
      historyRecord: c.historyRecord && {
        ...c.historyRecord,
        summary: fill(c.historyRecord.summary),
      },
    },
    affinityDelta: outcome.affinity,
    effect: outcome.effect ?? null,
    addTrait: outcome.addTrait ?? null,
    gifted,
    line,
    social: outcome.social
      ? { ...outcome.social, text: fill(outcome.social.text) }
      : null,
  };
}

/**
 * The relationship change an effect makes. 'conceive' is not structural
 * (the store schedules the birth), so it returns the people unchanged.
 */
export function applyInteractionEffect(
  people: Person[],
  personId: string,
  effect: InteractionEffect
): Person[] {
  return people.flatMap((p) => {
    if (p.id !== personId) return [p];
    switch (effect) {
      case 'engage':
        return [{ ...p, bond: 'engaged' as const }];
      case 'marry':
        return [{ ...p, bond: 'married' as const, title: 'your spouse' }];
      case 'break-up':
        return [{ ...p, role: 'ex' as const, bond: undefined, title: 'your ex' }];
      case 'cut-off':
        // Family stays family, estranged; everyone else leaves the story.
        return p.role === 'parent' || p.role === 'sibling' || p.role === 'child'
          ? [{ ...p, affinity: AFFINITY_MIN, traits: [...p.traits, 'estranged'] }]
          : [];
      default:
        return [p];
    }
  });
}

// ─── Weekly drift ───────────────────────────────────────────────────────────

function neglectRule(role: PersonRole) {
  if (role === 'partner') return NEGLECT.partner;
  if (role === 'child') return NEGLECT.child;
  if (role === 'parent' || role === 'sibling') return NEGLECT.family;
  return NEGLECT.other;
}

/**
 * One week of drift: people the artist hasn't made time for cool off.
 * Exes and the estranged are already as cold as they get.
 */
export function weeklyDrift(people: Person[], week: number): Person[] {
  return people.map((p) => {
    if (p.role === 'ex' || isEstranged(p)) return p;
    const rule = neglectRule(p.role);
    if (week - p.lastSeenWeek <= rule.graceWeeks) return p;
    const floor =
      p.traits.includes('supportive') && (p.role === 'parent' || p.role === 'sibling')
        ? Math.min(p.affinity, SUPPORTIVE_FLOOR)
        : AFFINITY_MIN;
    return { ...p, affinity: Math.max(floor, clampAffinity(p.affinity - rule.perWeek)) };
  });
}

export interface AllowanceResult {
  amount: number;
  payers: Person[];
}

/** What the artist's people pay them this week, capped. */
export function weeklyAllowance(
  people: Person[],
  artistMoney: number,
  giftedThisWeek: number
): AllowanceResult {
  if (artistMoney >= ALLOWANCE_STOPS_AT) return { amount: 0, payers: [] };
  const payers = activePeople(people).filter(
    (p) => (p.allowance ?? 0) > 0 && p.affinity >= ALLOWANCE_MIN_AFFINITY
  );
  const gross = payers.reduce((s, p) => s + (p.allowance ?? 0), 0);
  const amount = Math.min(gross, Math.max(0, PEOPLE_MONEY_CAP_PER_WEEK - giftedThisWeek));
  return { amount, payers: amount > 0 ? payers : [] };
}
