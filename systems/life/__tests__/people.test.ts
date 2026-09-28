import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyInteractionEffect,
  generateFamily,
  interactionAvailability,
  interactionWeight,
  resolveInteraction,
  weeklyAllowance,
  weeklyDrift,
  type InteractionContext,
} from '../peopleEngine';
import {
  bindPeople,
  canCast,
  personalizeEvent,
  rolesInEvent,
} from '../../events/personalize';
import { checkTrigger, isEventEligible, type EventContext } from '../../events/eventEngine';
import { FAMILIES } from '../../../data/life/families';
import { INTERACTIONS, getInteraction } from '../../../data/life/interactions';
import { PEOPLE_EVENTS } from '../../../data/events/peopleEvents';
import { ARCHETYPES } from '../../../data/archetypes';
import {
  ALLOWANCE_STOPS_AT,
  NEGLECT,
  PEOPLE_MONEY_CAP_PER_WEEK,
  SUPPORTIVE_FLOOR,
} from '../../../constants/gameConfig';
import { PERSON_ROLES, type Person } from '../../../types/people';
import type { GameEvent } from '../../../types/events';

let n = 0;
function person(over: Partial<Person> = {}): Person {
  n += 1;
  return {
    id: `p${n}`,
    name: `Name${n}`,
    role: 'friend',
    title: 'your friend',
    affinity: 20,
    traits: [],
    sinceWeek: 0,
    lastSeenWeek: 10,
    ...over,
  };
}

const CTX: InteractionContext = {
  week: 10,
  age: 25,
  energy: 100,
  money: 20_000,
  giftedThisWeek: 0,
  expecting: false,
};

// ─── Families ───────────────────────────────────────────────────────────────

test('every origin story comes with a family, and its intro names them', () => {
  for (const a of ARCHETYPES) {
    const template = FAMILIES[a.id];
    assert.ok(template && template.members.length > 0, `${a.id} has no family`);
    const { people, intro } = generateFamily(template, 1, () => 0.3);
    assert.equal(people.length, template.members.length);
    assert.equal(new Set(people.map((p) => p.name)).size, people.length, 'names repeat');
    assert.ok(!/\{\d\}/.test(intro), `${a.id} intro left a slot empty`);
    for (const p of people) assert.ok(intro.includes(p.name), `${a.id} intro skips ${p.name}`);
  }
});

test('the Rich Kid is funded and the Church Singer is disapproved of', () => {
  assert.ok(FAMILIES['rich-kid'].members.some((m) => (m.allowance ?? 0) > 0));
  assert.ok(
    FAMILIES['church-singer'].members.some(
      (m) => m.traits.includes('disapproving') && m.affinity < 0
    )
  );
});

// ─── Interactions ───────────────────────────────────────────────────────────

test('8+ interactions with unique ids, each reachable by some role', () => {
  assert.ok(INTERACTIONS.length >= 8, `only ${INTERACTIONS.length}`);
  assert.equal(new Set(INTERACTIONS.map((i) => i.id)).size, INTERACTIONS.length);
  for (const i of INTERACTIONS) {
    assert.ok(i.roles.length > 0 && i.roles.every((r) => PERSON_ROLES.includes(r)), i.id);
    assert.ok(i.outcomes.every((o) => o.weight > 0 && o.consequences.flavorText), i.id);
  }
});

test('availability: roles, bonds, careers, affinity, once a week, one baby at a time', () => {
  const propose = getInteraction('propose')!;
  const partner = person({ role: 'partner', bond: 'dating', affinity: 50 });
  assert.deepEqual(interactionAvailability(propose, partner, CTX), { ok: true });
  assert.equal(interactionAvailability(propose, { ...partner, bond: 'married' }, CTX).ok, false);
  assert.equal(interactionAvailability(propose, { ...partner, affinity: 10 }, CTX).ok, false);
  assert.equal(interactionAvailability(propose, person({ role: 'friend' }), CTX).ok, false);

  const collab = getInteraction('collab')!;
  assert.equal(interactionAvailability(collab, person(), CTX).ok, false, 'needs a career');
  assert.equal(interactionAvailability(collab, person({ npcId: 'npc-1' }), CTX).ok, true);

  const talk = getInteraction('spend-time')!;
  const seen = person({ lastInteractionWeek: CTX.week });
  assert.deepEqual(interactionAvailability(talk, seen, CTX), {
    ok: false,
    reason: 'Already saw them this week',
  });

  const baby = getInteraction('try-for-baby')!;
  assert.equal(interactionAvailability(baby, partner, { ...CTX, expecting: true }).ok, false);

  const estranged = person({ role: 'parent', traits: ['estranged'], affinity: -100 });
  assert.equal(interactionAvailability(talk, estranged, CTX).ok, false);
  assert.equal(interactionAvailability(getInteraction('apologize')!, estranged, CTX).ok, true);
});

test('affinity tilts outcomes like a skill', () => {
  const talk = getInteraction('spend-time')!;
  const good = talk.outcomes.find((o) => o.luck === 'good')!;
  const bad = talk.outcomes.find((o) => o.luck === 'bad')!;
  const warm = person({ affinity: 90 });
  const cold = person({ affinity: -90 });
  assert.ok(interactionWeight(good, warm) > interactionWeight(good, cold));
  assert.ok(interactionWeight(bad, warm) < interactionWeight(bad, cold));
});

test('resolution fills names and caps money from people per week', () => {
  const ask = getInteraction('ask-money')!;
  const mom = person({ role: 'parent', title: 'your mom', name: 'Denise', affinity: 80 });
  const yes = resolveInteraction(ask, mom, CTX, 'Nova Kay', () => 0);
  assert.equal(yes.outcome.id, 'yes');
  assert.match(yes.line, /^Denise sent you \$600/);

  const capped = resolveInteraction(
    ask,
    mom,
    { ...CTX, giftedThisWeek: PEOPLE_MONEY_CAP_PER_WEEK - 100 },
    'Nova Kay',
    () => 0
  );
  assert.equal(capped.gifted, 100);
  assert.equal(capped.consequences.moneyDelta, 100);
});

test('effects change the relationship itself', () => {
  const partner = person({ role: 'partner', bond: 'dating', title: 'your partner' });
  const engaged = applyInteractionEffect([partner], partner.id, 'engage')[0];
  assert.equal(engaged.bond, 'engaged');
  const married = applyInteractionEffect([engaged], partner.id, 'marry')[0];
  assert.equal(married.bond, 'married');
  assert.equal(married.title, 'your spouse');
  const ex = applyInteractionEffect([married], partner.id, 'break-up')[0];
  assert.equal(ex.role, 'ex');
  assert.equal(ex.bond, undefined);

  const dad = person({ role: 'parent' });
  const friend = person({ role: 'friend' });
  const cut = applyInteractionEffect(applyInteractionEffect([dad, friend], dad.id, 'cut-off'), friend.id, 'cut-off');
  assert.equal(cut.length, 1, 'a cut-off friend leaves the story');
  assert.ok(cut[0].traits.includes('estranged'), 'a cut-off parent stays, estranged');
});

// ─── Weekly ─────────────────────────────────────────────────────────────────

test('neglect cools people off after their grace period', () => {
  const week = 20;
  const partner = person({ role: 'partner', lastSeenWeek: week - NEGLECT.partner.graceWeeks - 1, affinity: 50 });
  const fresh = person({ role: 'partner', lastSeenWeek: week - 1, affinity: 50 });
  const mom = person({
    role: 'parent',
    traits: ['supportive'],
    affinity: SUPPORTIVE_FLOOR,
    lastSeenWeek: 0,
  });
  const ex = person({ role: 'ex', lastSeenWeek: 0, affinity: -30 });
  const [p, f, m, e] = weeklyDrift([partner, fresh, mom, ex], week);
  assert.equal(p.affinity, 50 - NEGLECT.partner.perWeek);
  assert.equal(f.affinity, 50);
  assert.equal(m.affinity, SUPPORTIVE_FLOOR, 'supportive family never drift below the floor');
  assert.equal(e.affinity, -30);
});

test('allowances need affinity, respect the cap, and stop once the artist is rich', () => {
  const dad = person({ role: 'parent', allowance: 800, affinity: 50 });
  const mom = person({ role: 'parent', allowance: 800, affinity: 50 });
  const cold = person({ role: 'parent', allowance: 800, affinity: 0 });
  assert.equal(weeklyAllowance([dad, mom, cold], 0, 0).amount, PEOPLE_MONEY_CAP_PER_WEEK);
  assert.equal(weeklyAllowance([cold], 0, 0).amount, 0);
  assert.equal(weeklyAllowance([dad], ALLOWANCE_STOPS_AT, 0).amount, 0);
});

// ─── Events that name people ────────────────────────────────────────────────

const byId = (id: string) => PEOPLE_EVENTS.find((e) => e.id === id)!;

test('people events only name roles that exist, and every one names someone', () => {
  for (const e of PEOPLE_EVENTS) {
    const roles = rolesInEvent(e);
    const introduces = e.choices.some((c) => c.consequences.addPerson);
    assert.ok(roles.size > 0 || introduces, `${e.id} names nobody`);
  }
  const rent = byId('people-sibling-rent');
  assert.equal(canCast(rent, { people: [person({ role: 'parent' })] }), false);
  assert.equal(canCast(rent, { people: [person({ role: 'sibling' })] }), true);
  assert.equal(
    canCast(rent, { people: [person({ role: 'sibling', traits: ['estranged'] })] }),
    false,
    'the estranged are out of the story'
  );
});

test('slating an event fills in real names and targets the named person', () => {
  const mom = person({ role: 'parent', name: 'Denise', title: 'your mom', affinity: -40 });
  const dad = person({ role: 'parent', name: 'Marcus', title: 'your dad', affinity: 30 });
  const show = byId('people-disapproving-parent-show');

  // The trigger is about a cold parent, so the cold parent is the one named.
  assert.equal(bindPeople(show, [dad, mom]).parent?.id, mom.id);
  const filled = personalizeEvent(show, { people: [dad, mom] });
  assert.equal(filled.title, 'Denise Is Coming to Your Show');
  assert.match(filled.description, /^Your mom has never been/);
  assert.ok(filled.choices[0].text.includes('Denise'));
  assert.equal(filled.choices[0].consequences.personChanges?.[0].personId, mom.id);
  const everything = JSON.stringify(filled);
  assert.ok(!/\{(parent|ParentTitle|parentTitle)\}/.test(everything), 'a token survived');
});

test('{new} names the newcomer everywhere, and the same person joins', () => {
  const offer = byId('people-manager-offer');
  const filled = personalizeEvent(offer, { people: [], newcomers: [{ name: 'Rook Vance', npcId: 'npc-9' }] }, () => 0);
  // A manager is not someone from the artist world: a generated name.
  const add = filled.choices[0].consequences.addPerson!;
  assert.equal(add.role, 'manager');
  assert.equal(add.npcId, undefined);
  assert.ok(filled.description.startsWith(`${add.name} has managed`));
  assert.ok(filled.choices[0].text.includes(add.name!));

  // When the event wants someone from the industry, the world supplies them.
  const industry: GameEvent = {
    ...offer,
    choices: offer.choices.map((c) => ({
      ...c,
      consequences: c.consequences.addPerson
        ? { ...c.consequences, addPerson: { ...c.consequences.addPerson, fromWorld: true } }
        : c.consequences,
    })),
  };
  const fromWorld = personalizeEvent(industry, { people: [], newcomers: [{ name: 'Rook Vance', npcId: 'npc-9' }] });
  assert.match(fromWorld.description, /^Rook Vance has managed/);
  assert.equal(fromWorld.choices[0].consequences.addPerson!.npcId, 'npc-9');
});

test('people triggers read the circle', () => {
  const ctx = (people: Person[]) => ({ people } as EventContext);
  const dating = person({ role: 'partner', bond: 'dating', affinity: 5 });
  assert.equal(checkTrigger({ type: 'has_partner' }, ctx([dating])), true);
  assert.equal(checkTrigger({ type: 'has_partner', bond: 'engaged' }, ctx([dating])), false);
  assert.equal(checkTrigger({ type: 'has_child' }, ctx([dating])), false);
  assert.equal(checkTrigger({ type: 'person_affinity_lte', role: 'partner', value: 10 }, ctx([dating])), true);
  assert.equal(checkTrigger({ type: 'person_affinity_gte', role: 'partner', value: 10 }, ctx([dating])), false);
  assert.equal(checkTrigger({ type: 'lacks_person', role: 'manager' }, ctx([dating])), true);
});

test('an event is ineligible when the person it names is missing', () => {
  const neverHome: GameEvent = byId('people-partner-never-home');
  const base = {
    week: 10,
    eventHistory: [],
    eventCooldowns: {},
    tags: [],
  } as unknown as EventContext;
  const cold = person({ role: 'partner', bond: 'dating', affinity: 0 });
  assert.equal(isEventEligible(neverHome, { ...base, people: [] }), false);
  assert.equal(isEventEligible(neverHome, { ...base, people: [cold] }), true);
});
