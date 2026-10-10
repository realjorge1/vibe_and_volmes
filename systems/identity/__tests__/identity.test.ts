import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActiveWant, IdentitySnapshot } from '../../../types/identity';
import { WANTS, getWant, WANT_SLOTS, MAX_FEARS } from '../../../data/identity/wants';
import { DREAMS } from '../../../data/identity/dreams';
import { TRAITS, TRAIT_RULES, STARTER_TRAITS, getTrait } from '../../../data/identity/traits';
import { fillWantText, judgeWants, rollWants, wantWeight } from '../wantsEngine';
import { isRipe, liveSeeds, makeSeed, seedForTrigger } from '../seedEngine';
import { traitTag, traitsFromTags } from '../traitTags';
import { BASE_STATS } from '../../../constants/gameConfig';

function snap(over: Partial<IdentitySnapshot> = {}): IdentitySnapshot {
  return {
    week: 10,
    yearWeek: 10,
    careerYear: 1,
    age: 24,
    lifeStage: 'young',
    stats: { ...BASE_STATS, fans: 5_000 },
    money: 3_000,
    genre: 'pop',
    traits: [],
    tags: [],
    releases: 2,
    lastReleaseWeek: 8,
    lastReception: 'solid',
    lastCritics: 60,
    bestPositionNow: null,
    bestPositionEver: 55,
    number1s: 0,
    top10s: 0,
    viral: 0,
    totalStreams: 100_000,
    labelOwnedTracks: 0,
    rerecords: 0,
    arcPhase: 'come-up',
    comebacks: 0,
    peakFans: 5_000,
    hasContract: false,
    onTour: false,
    toursDone: 0,
    showsPlayed: 0,
    bestShow: 0,
    festivalsPlayed: 0,
    headlinedFestival: false,
    nominations: 0,
    nominatedNow: false,
    awardsWon: 0,
    bigAwardsWon: 0,
    lifetimeEarnings: 10_000,
    controversyActive: false,
    controversiesSurvived: 0,
    warScore: null,
    rivalName: null,
    charityActs: 0,
    scandals: 0,
    partnerBond: null,
    children: 0,
    parentAffinity: 40,
    friends: 0,
    breakups: 0,
    homeRank: 1,
    luxuryCount: 0,
    statusScore: 0,
    mental: { burnout: 10, anxiety: 10, paranoia: 5, depression: 5, addictionRisk: 5, isolation: 10, inTreatment: false, lastCrisisWeek: null },
    inJail: false,
    servedTime: false,
    ownsLabel: false,
    signees: 0,
    starSignees: 0,
    ventures: 0,
    eras: 0,
    dreamsFulfilled: 0,
    wantsMet: 0,
    ...over,
  };
}

/** A deterministic sequence of rolls. */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

test('catalogs: unique ids, real traits, every predicate runs on a blank snapshot', () => {
  const wantIds = new Set(WANTS.map((w) => w.id));
  assert.equal(wantIds.size, WANTS.length);
  assert.equal(new Set(DREAMS.map((d) => d.id)).size, DREAMS.length);
  assert.equal(new Set(TRAITS.map((t) => t.id)).size, TRAITS.length);
  assert.ok(STARTER_TRAITS.length >= 10, 'enough personalities to pick from');
  for (const w of WANTS) {
    for (const t of w.traits ?? []) assert.ok(getTrait(t), `${w.id} leans on unknown trait ${t}`);
    const s = snap();
    w.eligible(s);
    w.met(s, w.target ? w.target(s) : 0, 1);
    if (w.kind === 'fear') assert.ok(w.relief, `${w.id} is a fear without relief`);
  }
  for (const d of DREAMS) {
    d.eligible?.(snap());
    d.met(snap());
    assert.ok(d.stages.length > 0, `${d.id} is offered in no stage`);
  }
  for (const r of TRAIT_RULES) {
    assert.ok(getTrait(r.trait), `rule for unknown trait ${r.trait}`);
    assert.equal(getTrait(r.trait)!.starter, false, `${r.trait} is earned, not picked`);
    r.test(snap());
  }
  for (const t of TRAITS) for (const c of t.conflicts ?? []) assert.ok(getTrait(c), `${t.id} conflicts with unknown ${c}`);
});

test('wants fill three slots, at most one fear, nothing already true', () => {
  const s = snap();
  const rolled = rollWants([], s, { rival: null, parent: 'Denise', partner: null }, [], seq(0.9, 0.1, 0.5, 0.3, 0.7));
  assert.equal(rolled.length, WANT_SLOTS);
  assert.ok(rolled.filter((w) => w.kind === 'fear').length <= MAX_FEARS);
  assert.equal(new Set(rolled.map((w) => w.defId)).size, rolled.length, 'no duplicates');
  for (const w of rolled) {
    const def = getWant(w.defId)!;
    if (!def.atDeadline) assert.equal(def.met(s, w.target, s.week), false, `${w.defId} was already true`);
    assert.ok(!w.text.includes('{'), `${w.text} has an unfilled token`);
  }
});

test('a token with no value keeps the goal out of the roll', () => {
  const rival = getWant('win-the-war')!;
  assert.equal(fillWantText(rival, 0, { rival: null }), null);
  assert.equal(fillWantText(rival, 0, { rival: 'Kairo' }), 'Win the war with Kairo');
});

test('traits make a goal likelier', () => {
  const def = getWant('win-the-war')!;
  assert.equal(wantWeight(def, ['petty', 'hothead']), def.weight * 4);
  assert.equal(wantWeight(def, []), def.weight);
});

test('judging: met wants pay out, due wants slip, fears come true or are faced', () => {
  const want: ActiveWant = { uid: 'a', defId: 'grow-fans', kind: 'want', text: 'Reach 6K fans', icon: 'people', rolledWeek: 5, dueWeek: 11, target: 6_000 };
  const fear: ActiveWant = { uid: 'b', defId: 'fear-broke', kind: 'fear', text: 'Going broke', icon: 'wallet', rolledWeek: 5, dueWeek: 11, target: 0 };

  const mid = judgeWants([want, fear], snap({ week: 8 }), false);
  assert.equal(mid.resolved.length, 0);

  const grown = judgeWants([want], snap({ week: 8, stats: { ...BASE_STATS, fans: 6_500 } }), false);
  assert.equal(grown.resolved[0].outcome, 'met');

  const due = judgeWants([want, fear], snap({ week: 11 }), true);
  assert.deepEqual(due.resolved.map((r) => r.outcome).sort(), ['faced', 'missed']);

  const broke = judgeWants([fear], snap({ week: 8, money: 100 }), false);
  assert.equal(broke.resolved[0].outcome, 'came-true');
});

test('seeds ripen, bind the oldest of their kind, and expire', () => {
  const plant = { kind: 'lent-money', after: [10, 10] as [number, number], who: 'npc' as const, note: 'You lent Dre $500.', name: 'Dre', npcId: 'npc-1' };
  const a = makeSeed(plant, 5, () => 0);
  const b = makeSeed({ ...plant, name: 'Kim', npcId: 'npc-2' }, 8, () => 0);
  assert.equal(isRipe(a, 14), false);
  assert.equal(isRipe(a, 15), true);
  const stage = (id: string) => (id === 'npc-1' ? 'star' : 'rising');
  assert.equal(seedForTrigger({ type: 'seed_ripe', seed: 'lent-money' }, [b, a], 20, stage)?.name, 'Dre', 'oldest first');
  assert.equal(seedForTrigger({ type: 'seed_ripe', seed: 'lent-money', npcStages: ['rising'] }, [a, b], 20, stage)?.name, 'Kim');
  assert.equal(seedForTrigger({ type: 'seed_ripe', seed: 'other' }, [a, b], 20, stage), null);
  assert.equal(liveSeeds([a, b], a.expiresWeek).length, 1);
});

test('traits are tags with a prefix', () => {
  assert.equal(traitTag('petty'), 'trait:petty');
  assert.deepEqual(traitsFromTags(['street-cred', 'trait:petty', 'trait:loyal']), ['petty', 'loyal']);
});
