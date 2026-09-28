import type { EventConsequence, EventTrigger, GameEvent } from '../../types/events';
import { PERSON_ROLES, type Person, type PersonRole } from '../../types/people';
import type { LuxuryCategory } from '../../types/status';
import { activePeople, capitalize } from '../life/peopleEngine';
import { FIRST_NAMES } from '../../data/life/names';

/**
 * Events that name the artist's life. Event text uses tokens that are
 * filled when the event is slated, so the Deck, the choices and the outcome
 * all talk about the same people and things:
 *
 * - `{parent}` is a name ("Denise"), `{parentTitle}` how the story refers to
 *   them ("your mom"), `{ParentTitle}` the same at the start of a sentence —
 *   for every person role.
 * - `{new}` names someone entering the artist's life via `addPerson`.
 * - `{asset}` names something the artist owns; `{home}` / `{Home}` is where
 *   they live ("your penthouse").
 *
 * An event whose text needs a role or an asset the artist doesn't have is
 * never eligible, so a token can't reach the screen unfilled.
 */

export interface NewcomerCandidate {
  name: string;
  npcId?: string;
}

/** An owned luxury item, as the story sees it. */
export interface AssetView {
  itemId: string;
  name: string;
  category: LuxuryCategory;
  cost: number;
}

/** Everyone and everything an event can name. */
export interface StoryCast {
  people: Person[];
  /** Strangers `{new}` can introduce (unlinked world NPCs). */
  newcomers?: NewcomerCandidate[];
  assets?: AssetView[];
  /** Lowercase, e.g. "your shared apartment". */
  homeTitle?: string;
}

const ROLE_TOKEN = new RegExp(`\\{(${PERSON_ROLES.join('|')})(Title)?\\}`, 'gi');

function eventTexts(event: GameEvent): string[] {
  return [
    event.title,
    event.description,
    ...event.choices.flatMap((c) => [
      c.text,
      c.consequences.flavorText,
      c.consequences.historyRecord?.summary ?? '',
    ]),
  ];
}

interface Needs {
  roles: Set<PersonRole>;
  asset: boolean;
}

const needsCache = new WeakMap<GameEvent, Needs>();

function needsOf(event: GameEvent): Needs {
  const cached = needsCache.get(event);
  if (cached) return cached;
  const roles = new Set<PersonRole>();
  let asset = false;
  for (const text of eventTexts(event)) {
    for (const m of text.matchAll(ROLE_TOKEN)) roles.add(m[1].toLowerCase() as PersonRole);
    if (text.includes('{asset}')) asset = true;
  }
  for (const c of event.choices) {
    for (const pc of c.consequences.personChanges ?? []) roles.add(pc.role);
    if (c.consequences.asset) asset = true;
  }
  const needs = { roles, asset };
  needsCache.set(event, needs);
  return needs;
}

/** Roles an event needs: named in its text or targeted by its consequences. */
export function rolesInEvent(event: GameEvent): Set<PersonRole> {
  return needsOf(event).roles;
}

/**
 * Who plays each role. A trigger about affinity picks the person who made
 * it true (the coldest for `_lte`, the warmest for `_gte`); otherwise the
 * closest person in that role.
 */
export function bindPeople(event: GameEvent, people: Person[]): Partial<Record<PersonRole, Person>> {
  const pool = activePeople(people);
  const bindings: Partial<Record<PersonRole, Person>> = {};
  const trigger = (role: PersonRole): EventTrigger | undefined =>
    event.triggers.find(
      (t) =>
        t.role === role &&
        (t.type === 'person_affinity_lte' || t.type === 'person_affinity_gte')
    );
  for (const role of rolesInEvent(event)) {
    const candidates = pool.filter((p) => p.role === role);
    if (candidates.length === 0) continue;
    const t = trigger(role);
    const coldestFirst = t?.type === 'person_affinity_lte';
    const sorted = [...candidates].sort((a, b) =>
      coldestFirst ? a.affinity - b.affinity : b.affinity - a.affinity
    );
    const matching = t
      ? sorted.filter((p) =>
          t.type === 'person_affinity_lte'
            ? p.affinity <= (t.value ?? 0)
            : p.affinity >= (t.value ?? 0)
        )
      : sorted;
    bindings[role] = matching[0] ?? sorted[0];
  }
  return bindings;
}

/**
 * The asset an event is about: the priciest one matching its `owns_asset`
 * trigger (what a burglar would take), else the priciest overall.
 */
export function bindAsset(event: GameEvent, assets: AssetView[]): AssetView | null {
  const t = event.triggers.find((tr) => tr.type === 'owns_asset');
  const pool = assets.filter(
    (a) =>
      (!t?.asset || a.itemId === t.asset) &&
      (!t?.assetCategory || a.category === t.assetCategory)
  );
  return [...pool].sort((a, b) => b.cost - a.cost)[0] ?? null;
}

/** Can this event be told with this cast? */
export function canCast(event: GameEvent, cast: StoryCast): boolean {
  const needs = needsOf(event);
  const present = new Set(activePeople(cast.people).map((p) => p.role));
  for (const role of needs.roles) if (!present.has(role)) return false;
  if (needs.asset && !bindAsset(event, cast.assets ?? [])) return false;
  return true;
}

function fill(
  text: string,
  bindings: Partial<Record<PersonRole, Person>>,
  newcomer: NewcomerCandidate | null,
  asset: AssetView | null,
  homeTitle: string | undefined
): string {
  let out = text.replace(ROLE_TOKEN, (whole, rawRole: string, title?: string) => {
    const person = bindings[rawRole.toLowerCase() as PersonRole];
    if (!person) return whole;
    if (!title) return person.name;
    return rawRole[0] === rawRole[0].toUpperCase() ? capitalize(person.title) : person.title;
  });
  if (newcomer) out = out.replace(/\{new\}/g, newcomer.name);
  if (asset) out = out.replace(/\{asset\}/g, asset.name);
  if (homeTitle) {
    out = out.replace(/\{home\}/g, homeTitle).replace(/\{Home\}/g, capitalize(homeTitle));
  }
  return out;
}

/**
 * A copy of `event` with its cast filled in: people named and every
 * `personChanges` entry pointed at the bound person, `{new}` chosen, and the
 * `{asset}` bound to a specific owned item.
 */
export function personalizeEvent(
  event: GameEvent,
  cast: StoryCast,
  rng: () => number = Math.random
): GameEvent {
  const bindings = bindPeople(event, cast.people);
  const needs = needsOf(event);
  const asset = needs.asset ? bindAsset(event, cast.assets ?? []) : null;
  const wantsNew = event.choices.some((c) => c.consequences.addPerson);
  const fromWorld = event.choices.some((c) => c.consequences.addPerson?.fromWorld);
  const newcomers = cast.newcomers ?? [];
  const newcomer: NewcomerCandidate | null = !wantsNew
    ? null
    : fromWorld && newcomers.length > 0
      ? newcomers[0]
      : { name: FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)] };

  const f = (t: string) => fill(t, bindings, newcomer, asset, cast.homeTitle);
  const fillConsequences = (c: EventConsequence): EventConsequence => ({
    ...c,
    flavorText: f(c.flavorText),
    historyRecord: c.historyRecord && { ...c.historyRecord, summary: f(c.historyRecord.summary) },
    personChanges: c.personChanges?.map((pc) => ({
      ...pc,
      personId: bindings[pc.role]?.id,
    })),
    addPerson:
      c.addPerson && newcomer
        ? {
            ...c.addPerson,
            name: newcomer.name,
            npcId: c.addPerson.fromWorld ? newcomer.npcId : undefined,
          }
        : c.addPerson,
    asset: c.asset && asset ? { ...c.asset, itemId: asset.itemId } : c.asset,
  });

  return {
    ...event,
    title: f(event.title),
    description: f(event.description),
    choices: event.choices.map((c) => ({
      ...c,
      text: f(c.text),
      consequences: fillConsequences(c.consequences),
    })),
  };
}
