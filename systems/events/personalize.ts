import type { EventConsequence, EventTrigger, GameEvent } from '../../types/events';
import { PERSON_ROLES, type Person, type PersonRole } from '../../types/people';
import { activePeople, capitalize } from '../life/peopleEngine';
import { FIRST_NAMES } from '../../data/life/names';

/**
 * Events that name the artist's people. Event text uses role tokens —
 * `{parent}` is a name ("Denise"), `{parentTitle}` how the story refers to
 * them ("your mom"), `{ParentTitle}` the same at the start of a sentence —
 * and `{new}` names someone entering the artist's life via `addPerson`.
 *
 * When an event is slated, each role it mentions is bound to one real person
 * and the text is filled in, so the Deck, the choices and the outcome all
 * talk about the same Denise. An event whose text needs a role the artist
 * doesn't have is never eligible, so a token can't reach the screen unfilled.
 */

const TOKEN = new RegExp(`\\{(${PERSON_ROLES.join('|')})(Title)?\\}`, 'gi');

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

const rolesCache = new WeakMap<GameEvent, Set<PersonRole>>();

/** Roles an event needs: named in its text or targeted by its consequences. */
export function rolesInEvent(event: GameEvent): Set<PersonRole> {
  const cached = rolesCache.get(event);
  if (cached) return cached;
  const roles = new Set<PersonRole>();
  for (const text of eventTexts(event)) {
    for (const m of text.matchAll(TOKEN)) roles.add(m[1].toLowerCase() as PersonRole);
  }
  for (const c of event.choices) {
    for (const pc of c.consequences.personChanges ?? []) roles.add(pc.role);
  }
  rolesCache.set(event, roles);
  return roles;
}

export function hasRoles(event: GameEvent, people: Person[]): boolean {
  const present = new Set(activePeople(people).map((p) => p.role));
  for (const role of rolesInEvent(event)) if (!present.has(role)) return false;
  return true;
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

export interface NewcomerCandidate {
  name: string;
  npcId?: string;
}

function fill(
  text: string,
  bindings: Partial<Record<PersonRole, Person>>,
  newcomer: NewcomerCandidate | null
): string {
  const out = text.replace(TOKEN, (whole, rawRole: string, title?: string) => {
    const person = bindings[rawRole.toLowerCase() as PersonRole];
    if (!person) return whole;
    if (!title) return person.name;
    return rawRole[0] === rawRole[0].toUpperCase() ? capitalize(person.title) : person.title;
  });
  return newcomer ? out.replace(/\{new\}/g, newcomer.name) : out;
}

/**
 * A copy of `event` with its people filled in and every `personChanges`
 * entry pointed at the bound person. `newcomers` are candidate strangers for
 * `{new}` (world NPCs when the event wants someone from the industry).
 */
export function personalizeEvent(
  event: GameEvent,
  people: Person[],
  newcomers: NewcomerCandidate[] = [],
  rng: () => number = Math.random
): GameEvent {
  const bindings = bindPeople(event, people);
  const wantsNew = event.choices.some((c) => c.consequences.addPerson);
  const fromWorld = event.choices.some((c) => c.consequences.addPerson?.fromWorld);
  const newcomer: NewcomerCandidate | null = !wantsNew
    ? null
    : fromWorld && newcomers.length > 0
      ? newcomers[0]
      : { name: FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)] };

  const hasTokens =
    Object.keys(bindings).length > 0 || newcomer !== null;
  if (!hasTokens) return event;

  const f = (t: string) => fill(t, bindings, newcomer);
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
