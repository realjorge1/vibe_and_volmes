import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bloodlineFor,
  buildHeir,
  endingChance,
  fillFinalLine,
  rollEnding,
  type EndingContext,
  type HeirSource,
} from '../endingEngine';
import { ENDINGS, RETIREMENT, getEnding } from '../../../data/life/endings';
import { BLOODLINES } from '../../../data/meta/bloodlines';
import { getPerk } from '../../../data/meta/perks';
import {
  BASE_STATS,
  HEIR_FANS_CAP,
  HEIR_MONEY_CAP,
  HEIR_MONEY_SHARE,
  MIN_START_AGE,
  WEEKS_PER_YEAR,
} from '../../../constants/gameConfig';
import type { MentalState } from '../../../types/industry';
import type { Person } from '../../../types/people';
import type { Player } from '../../../types/player';

const CALM: MentalState = {
  burnout: 0,
  anxiety: 0,
  paranoia: 0,
  depression: 0,
  addictionRisk: 0,
  isolation: 0,
} as MentalState;

function ctx(over: Partial<EndingContext> = {}): EndingContext {
  return {
    week: 100,
    age: 30,
    stats: { ...BASE_STATS, energy: 50 },
    mental: CALM,
    tags: [],
    ...over,
  };
}

test('four or more ways to end, plus retirement, each with a last line', () => {
  assert.ok(ENDINGS.length >= 4);
  const ids = new Set([...ENDINGS, RETIREMENT].map((e) => e.id));
  assert.equal(ids.size, ENDINGS.length + 1);
  for (const e of [...ENDINGS, RETIREMENT]) {
    assert.ok(e.finalLine.includes('{artist}') && e.finalLine.includes('{age}'), e.id);
  }
  assert.equal(
    fillFinalLine(getEnding('burnout'), 'Nova Kay', 34),
    'Nova Kay walked away from music at 34. There was nothing left to give.'
  );
  assert.equal(getEnding('nonsense').id, 'retirement');
});

test('a healthy young artist never ends', () => {
  for (const e of ENDINGS) assert.equal(endingChance(e, ctx()), 0, e.id);
  assert.equal(rollEnding(ctx(), () => 0), null);
});

test('each ending opens only on its own conditions', () => {
  const burnt = ctx({
    stats: { ...BASE_STATS, mentalHealth: 5 },
    mental: { ...CALM, burnout: 90 },
  });
  assert.equal(rollEnding(burnt, () => 0)?.id, 'burnout');
  assert.equal(rollEnding({ ...burnt, week: 3 }, () => 0), null, 'not in the first weeks');

  const cancelled = ctx({ stats: { ...BASE_STATS, reputation: 3, industryRespect: 5 } });
  assert.equal(rollEnding(cancelled, () => 0)?.id, 'cancelled');

  const reckless = ctx({ mental: { ...CALM, addictionRisk: 95 } });
  assert.equal(rollEnding(reckless, () => 0)?.id, 'died-reckless');

  const sick = ctx({ age: 55, tags: ['health-risk'] });
  assert.equal(rollEnding(sick, () => 0)?.id, 'died-of-health');
  assert.equal(rollEnding({ ...sick, age: 45 }, () => 0), null);

  assert.equal(rollEnding(ctx({ age: 80 }), () => 0)?.id, 'died-of-age');
});

test('old age gets riskier every year, and the roll has to land', () => {
  const age = getEnding('died-of-age');
  assert.equal(endingChance(age, ctx({ age: 74 })), 0);
  const at75 = endingChance(age, ctx({ age: 75 }));
  const at90 = endingChance(age, ctx({ age: 90 }));
  assert.ok(at90 > at75 && at75 > 0);
  assert.equal(rollEnding(ctx({ age: 75 }), () => 0.99), null);
});

test('a child is born into the bloodline of how the parent is remembered', () => {
  assert.equal(bloodlineFor('tragic-prodigy'), 'cursed-bloodline');
  assert.equal(bloodlineFor('cult-favorite'), 'old-craft');
  assert.equal(bloodlineFor('journeyman'), null);
  for (const b of BLOODLINES) assert.ok(getPerk(b.perkId), `${b.id} grants a real perk`);
});

// ─── Heirs ──────────────────────────────────────────────────────────────────

const player: Player = {
  id: 'p',
  artistName: 'Nova Kay',
  realName: 'Nova Okafor',
  gender: 'female',
  genre: 'r&b',
  city: 'atlanta',
  archetype: 'church-singer',
  stats: { ...BASE_STATS },
  money: 2_000_000,
  week: 1,
  createdAt: 1,
  startAge: 24,
};

const person = (over: Partial<Person>): Person => ({
  id: over.id ?? 'x',
  name: 'X',
  role: 'child',
  title: 'your daughter',
  affinity: 60,
  traits: [],
  sinceWeek: 0,
  lastSeenWeek: 0,
  ...over,
});

function source(over: Partial<HeirSource> = {}): HeirSource {
  const partner = person({ id: 'partner', name: 'Kai', role: 'partner', title: 'your spouse', npcId: 'npc-1' });
  const kid = person({ id: 'kid', name: 'Luna', bornWeek: 10, otherParentId: 'partner', affinity: 75 });
  const brother = person({ id: 'bro', name: 'Milo', title: 'your son', bornWeek: 20 });
  return {
    player,
    week: 10 + 12 * WEEKS_PER_YEAR,
    child: kid,
    people: [partner, kid, brother],
    peakFans: 50_000_000,
    rivalIds: ['rival-1'],
    identity: 'tragic-prodigy',
    identityTitle: 'The Tragic Prodigy',
    legacyTier: 'icon',
    ending: 'died-reckless',
    died: true,
    ...over,
  };
}

test('an heir inherits a capped share, a following, rivals and a bloodline', () => {
  const heir = buildHeir(source());
  assert.equal(heir.generation, 2);
  assert.equal(heir.childName, 'Luna');
  assert.equal(heir.surname, 'Okafor');
  assert.equal(heir.gender, 'female');
  assert.equal(heir.startAge, MIN_START_AGE, 'a 12-year-old grows up off-screen');
  assert.equal(heir.money, Math.min(HEIR_MONEY_CAP, player.money * HEIR_MONEY_SHARE));
  assert.equal(heir.fans, HEIR_FANS_CAP);
  assert.deepEqual(heir.rivalIds, ['rival-1']);
  assert.equal(heir.bloodlineId, 'cursed-bloodline');
  assert.equal(heir.city, 'atlanta');
  assert.equal(heir.genre, 'r&b');
});

test('the family carries over, with the parent only if they lived', () => {
  const died = buildHeir(source());
  assert.deepEqual(
    died.family.map((m) => `${m.title}:${m.name}`),
    ['your parent:Kai', 'your brother:Milo']
  );

  const retired = buildHeir(source({ died: false, ending: 'retirement' }));
  const mom = retired.family.find((m) => m.traits.includes('famous-parent') && m.title === 'your mom');
  assert.ok(mom, 'the retired artist is family now');
  assert.equal(mom!.name, 'Nova');
  assert.equal(mom!.affinity, 75);
});

test('grandchildren count generations', () => {
  const heir = buildHeir(source({ player: { ...player, generation: 2 } }));
  assert.equal(heir.generation, 3);
});
