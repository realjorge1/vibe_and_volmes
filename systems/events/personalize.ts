import type { EventConsequence, EventTrigger, GameEvent } from '../../types/events';
import { PERSON_ROLES, type Person, type PersonRole } from '../../types/people';
import type { LuxuryCategory } from '../../types/status';
import type { Seed, SeedPlant } from '../../types/identity';
import { activePeople, capitalize } from '../life/peopleEngine';
import { FIRST_NAMES } from '../../data/life/names';
import { seedForEvent } from '../identity/seedEngine';
import { agoPhrase } from '../calendar/calendar';
import { formatMoney } from '../../utils/statHelpers';

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
 * - `{seed}` is who a paid-off choice was about, `{ago}` when it happened.
 * - `{legend}` / `{legendHit}`: a past life, and their biggest song.
 * - `{signee}` an artist on the artist's own label, `{myLabel}` its name.
 * - `{mastersPrice}`: what buying the masters back costs. `{charge}`: the
 *   charge the artist is facing.
 *
 * An event whose text needs something the artist doesn't have is never
 * eligible, so a token can't reach the screen unfilled.
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

/** A past life, as the story sees it. */
export interface LegendView {
  id: string;
  name: string;
  /** Their biggest song, if they had one. */
  hit: string | null;
}

/** Everyone and everything an event can name. */
export interface StoryCast {
  people: Person[];
  /** Strangers `{new}` can introduce (unlinked world NPCs). */
  newcomers?: NewcomerCandidate[];
  assets?: AssetView[];
  /** Lowercase, e.g. "your shared apartment". */
  homeTitle?: string;
  /** The rival `{rival}` names (the hottest rivalry). */
  rival?: { id: string; name: string } | null;
  week?: number;
  seeds?: Seed[];
  npcStageOf?: (npcId: string) => string | undefined;
  legends?: { alive: LegendView[]; dead: LegendView[] };
  signees?: { npcId: string; name: string; stage: string }[];
  labelName?: string | null;
  mastersPrice?: number;
  chargeLabel?: string | null;
  /** The artist's stage name, for `{playerName}` in event text. */
  playerName?: string;
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
      c.consequences.plantSeed?.note ?? '',
      // Moment headlines fill their own {partner}/{rival} when they spawn, so
      // they don't make an event need anyone; the new tokens are filled below.
    ]),
  ];
}

interface Needs {
  roles: Set<PersonRole>;
  asset: boolean;
  rival: boolean;
  seed: boolean;
  legend: boolean;
  signee: boolean;
  label: boolean;
  charge: boolean;
}

const needsCache = new WeakMap<GameEvent, Needs>();

function needsOf(event: GameEvent): Needs {
  const cached = needsCache.get(event);
  if (cached) return cached;
  const roles = new Set<PersonRole>();
  let asset = false;
  let rival = false;
  let seed = event.triggers.some((t) => t.type === 'seed_ripe');
  let legend = false;
  let signee = false;
  let label = false;
  let charge = false;
  for (const text of eventTexts(event)) {
    for (const m of text.matchAll(ROLE_TOKEN)) roles.add(m[1].toLowerCase() as PersonRole);
    if (text.includes('{asset}')) asset = true;
    if (text.includes('{rival}')) rival = true;
    if (text.includes('{seed}') || text.includes('{ago}')) seed = true;
    if (text.includes('{legend}') || text.includes('{legendHit}')) legend = true;
    if (text.includes('{signee}')) signee = true;
    if (text.includes('{myLabel}')) label = true;
    if (text.includes('{charge}')) charge = true;
  }
  for (const c of event.choices) {
    for (const pc of c.consequences.personChanges ?? []) roles.add(pc.role);
    if (c.consequences.asset) asset = true;
    if (c.consequences.signee) signee = true;
    const who = c.consequences.plantSeed?.who;
    if (who && (PERSON_ROLES as readonly string[]).includes(who)) roles.add(who as PersonRole);
    if (who === 'rival') rival = true;
  }
  const needs = { roles, asset, rival, seed, legend, signee, label, charge };
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

/** The past life an event is about: the most recent one of the kind it asks for. */
export function bindLegend(event: GameEvent, cast: StoryCast): LegendView | null {
  const t = event.triggers.find((tr) => tr.type === 'has_legend');
  const alive = cast.legends?.alive ?? [];
  const dead = cast.legends?.dead ?? [];
  const pool = t?.legend === 'alive' ? alive : t?.legend === 'dead' ? dead : [...alive, ...dead];
  const needsHit = eventTexts(event).some((x) => x.includes('{legendHit}'));
  return pool.find((l) => !needsHit || !!l.hit) ?? null;
}

function bindSeed(event: GameEvent, cast: StoryCast): Seed | null {
  return seedForEvent(event, cast.seeds ?? [], cast.week ?? 0, cast.npcStageOf ?? (() => undefined));
}

/** Can this event be told with this cast? */
export function canCast(event: GameEvent, cast: StoryCast): boolean {
  const needs = needsOf(event);
  const present = new Set(activePeople(cast.people).map((p) => p.role));
  for (const role of needs.roles) if (!present.has(role)) return false;
  if (needs.asset && !bindAsset(event, cast.assets ?? [])) return false;
  if (needs.rival && !cast.rival) return false;
  if (needs.seed) {
    const seed = bindSeed(event, cast);
    if (!seed) return false;
    const usesName = eventTexts(event).some((x) => x.includes('{seed}'));
    if (usesName && !seed.name) return false;
  }
  if (needs.legend && !bindLegend(event, cast)) return false;
  if (needs.signee && (cast.signees?.length ?? 0) === 0) return false;
  if (needs.label && !cast.labelName) return false;
  if (needs.charge && !cast.chargeLabel) return false;
  return true;
}

interface Binding {
  people: Partial<Record<PersonRole, Person>>;
  newcomer: NewcomerCandidate | null;
  asset: AssetView | null;
  homeTitle?: string;
  rival?: { id: string; name: string } | null;
  seed: Seed | null;
  week: number;
  legend: LegendView | null;
  signee: { npcId: string; name: string } | null;
  labelName?: string | null;
  mastersPrice?: number;
  chargeLabel?: string | null;
  playerName?: string;
}

function fill(text: string, b: Binding): string {
  let out = text.replace(ROLE_TOKEN, (whole, rawRole: string, title?: string) => {
    const person = b.people[rawRole.toLowerCase() as PersonRole];
    if (!person) return whole;
    if (!title) return person.name;
    return rawRole[0] === rawRole[0].toUpperCase() ? capitalize(person.title) : person.title;
  });
  const swap = (token: string, value: string | null | undefined) => {
    if (value) out = out.split(token).join(value);
  };
  swap('{new}', b.newcomer?.name);
  swap('{asset}', b.asset?.name);
  if (b.homeTitle) {
    swap('{home}', b.homeTitle);
    swap('{Home}', capitalize(b.homeTitle));
  }
  swap('{rival}', b.rival?.name);
  swap('{seed}', b.seed?.name);
  if (b.seed) swap('{ago}', agoPhrase(b.week - b.seed.plantedWeek));
  swap('{legend}', b.legend?.name);
  swap('{legendHit}', b.legend?.hit ?? undefined);
  swap('{signee}', b.signee?.name);
  swap('{myLabel}', b.labelName ?? undefined);
  if (b.mastersPrice !== undefined) swap('{mastersPrice}', formatMoney(b.mastersPrice));
  swap('{charge}', b.chargeLabel ? b.chargeLabel.toLowerCase() : undefined);
  swap('{playerName}', b.playerName);
  return out;
}

/** Point a seed planted by this choice at the right someone. */
function bindPlant(plant: SeedPlant, b: Binding, f: (t: string) => string): SeedPlant {
  const out: SeedPlant = { ...plant, note: f(plant.note) };
  const who = plant.who;
  if (who === 'new' && b.newcomer) {
    out.name = b.newcomer.name;
    out.npcId = b.newcomer.npcId;
  } else if (who === 'rival' && b.rival) {
    out.name = b.rival.name;
    out.rivalId = b.rival.id;
  } else if (who === 'seed' && b.seed) {
    out.name = b.seed.name;
    out.npcId = b.seed.npcId;
    out.personId = b.seed.personId;
    out.rivalId = b.seed.rivalId;
  } else if (who && (PERSON_ROLES as readonly string[]).includes(who)) {
    const person = b.people[who as PersonRole];
    if (person) {
      out.name = person.name;
      out.personId = person.id;
      out.npcId = person.npcId;
    }
  }
  return out;
}

/**
 * A copy of `event` with its cast filled in: people named and every
 * `personChanges` entry pointed at the bound person, `{new}` chosen, the
 * `{asset}` bound to a specific owned item, and a paid-off seed bound.
 */
export function personalizeEvent(
  event: GameEvent,
  cast: StoryCast,
  rng: () => number = Math.random
): GameEvent {
  const needs = needsOf(event);
  const wantsNew =
    event.choices.some((c) => c.consequences.addPerson) ||
    event.choices.some((c) => c.consequences.plantSeed?.who === 'new') ||
    eventTexts(event).some((t) => t.includes('{new}'));
  const fromWorld =
    event.choices.some((c) => c.consequences.addPerson?.fromWorld) ||
    event.choices.some((c) => c.consequences.plantSeed?.who === 'new');
  const newcomers = cast.newcomers ?? [];
  const signee =
    needs.signee && cast.signees && cast.signees.length > 0
      ? cast.signees[Math.floor(rng() * cast.signees.length)]
      : null;
  const b: Binding = {
    people: bindPeople(event, cast.people),
    newcomer: !wantsNew
      ? null
      : fromWorld && newcomers.length > 0
        ? newcomers[0]
        : { name: FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)] },
    asset: needs.asset ? bindAsset(event, cast.assets ?? []) : null,
    homeTitle: cast.homeTitle,
    rival: cast.rival,
    seed: needs.seed ? bindSeed(event, cast) : null,
    week: cast.week ?? 0,
    legend: needs.legend ? bindLegend(event, cast) : null,
    signee: signee ? { npcId: signee.npcId, name: signee.name } : null,
    labelName: cast.labelName,
    mastersPrice: cast.mastersPrice,
    chargeLabel: cast.chargeLabel,
    playerName: cast.playerName,
  };

  const f = (t: string) => fill(t, b);
  const fillConsequences = (c: EventConsequence): EventConsequence => ({
    ...c,
    flavorText: f(c.flavorText),
    historyRecord: c.historyRecord && { ...c.historyRecord, summary: f(c.historyRecord.summary) },
    personChanges: c.personChanges?.map((pc) => ({
      ...pc,
      personId: b.people[pc.role]?.id,
    })),
    addPerson:
      c.addPerson && b.newcomer
        ? {
            ...c.addPerson,
            name: b.newcomer.name,
            npcId: c.addPerson.fromWorld ? b.newcomer.npcId : undefined,
          }
        : c.addPerson,
    asset: c.asset && b.asset ? { ...c.asset, itemId: b.asset.itemId } : c.asset,
    rivalryIntensityDelta:
      c.rivalryIntensityDelta && needs.rival && cast.rival && !c.rivalryIntensityDelta.artistId
        ? { ...c.rivalryIntensityDelta, artistId: cast.rival.id }
        : c.rivalryIntensityDelta,
    plantSeed: c.plantSeed ? bindPlant(c.plantSeed, b, f) : undefined,
    moment: c.moment ? { ...c.moment, headline: f(c.moment.headline), topic: f(c.moment.topic) } : undefined,
    signee: c.signee && b.signee ? { ...c.signee, npcId: b.signee.npcId } : c.signee,
  });

  return {
    ...event,
    title: f(event.title),
    description: f(event.description),
    choices: event.choices.map((ch) => ({
      ...ch,
      text: f(ch.text),
      consequences: fillConsequences(ch.consequences),
    })),
    ...(b.seed
      ? { seedId: b.seed.id, callback: { week: b.seed.plantedWeek, note: b.seed.note } }
      : {}),
  };
}
