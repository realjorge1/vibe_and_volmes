import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activityAvailability,
  effectiveWeight,
  pickOutcome,
  resolveActivity,
  type ActivityContext,
} from '../activityEngine';
import { ACTIVITY_CATEGORIES, LIFE_ACTIVITIES, getLifeActivity } from '../../../data/life/lifeActions';
import {
  ACTIVITIES_PER_WEEK,
  ACTIVITY_EARNINGS_CAP_PER_WEEK,
  BASE_STATS,
} from '../../../constants/gameConfig';
import type { LifeActivity } from '../../../types/life';

function ctx(over: Partial<ActivityContext> = {}): ActivityContext {
  return {
    week: 10,
    age: 25,
    level: 1,
    careerStage: 'novice',
    stats: { ...BASE_STATS, energy: 100, fans: 0 },
    money: 10_000,
    tags: [],
    hasRival: false,
    doneThisWeek: 0,
    earnedThisWeek: 0,
    lastDone: {},
    ...over,
  };
}

const TOKENS = { playerName: 'Nova Kay', npc: 'DJ Rook' };

// ─── Catalog ────────────────────────────────────────────────────────────────

test('20+ activities, at least three in each of the six categories', () => {
  assert.ok(LIFE_ACTIVITIES.length >= 20, `only ${LIFE_ACTIVITIES.length}`);
  assert.equal(ACTIVITY_CATEGORIES.length, 6);
  for (const cat of ACTIVITY_CATEGORIES) {
    const n = LIFE_ACTIVITIES.filter((a) => a.category === cat.id).length;
    assert.ok(n >= 3, `${cat.id} has ${n}`);
  }
});

test('activity and outcome ids are unique; weights and costs are sane', () => {
  const ids = new Set<string>();
  for (const a of LIFE_ACTIVITIES) {
    assert.ok(!ids.has(a.id), `duplicate activity ${a.id}`);
    ids.add(a.id);
    assert.ok(a.energyCost > 0, `${a.id} is free`);
    assert.ok(a.outcomes.length >= 2, `${a.id} has one outcome`);
    const outcomeIds = new Set(a.outcomes.map((o) => o.id));
    assert.equal(outcomeIds.size, a.outcomes.length, `${a.id} repeats an outcome id`);
    for (const o of a.outcomes) {
      assert.ok(o.weight > 0, `${a.id}/${o.id} can never happen`);
      assert.ok(o.consequences.flavorText.length > 0, `${a.id}/${o.id} writes no story`);
    }
  }
});

test('{npc} only appears in activities that say who it is', () => {
  for (const a of LIFE_ACTIVITIES) {
    const texts = a.outcomes.flatMap((o) => [
      o.consequences.flavorText,
      o.consequences.historyRecord?.summary ?? '',
      o.social?.text ?? '',
    ]);
    if (texts.some((t) => t.includes('{npc}'))) {
      assert.ok(a.npc, `${a.id} uses {npc} but sets no npc source`);
    }
  }
});

// ─── Availability ───────────────────────────────────────────────────────────

test('gates lock with a reason; resources block without locking', () => {
  const club = getLifeActivity('club-night')!;
  const underage = activityAvailability(club, ctx({ age: 19 }));
  assert.deepEqual(underage, { ok: false, locked: true, reason: 'Age 21+' });
  assert.deepEqual(activityAvailability(club, ctx({ age: 21 })), { ok: true });

  const celeb = getLifeActivity('celebrity-date')!;
  const early = activityAvailability(celeb, ctx());
  assert.equal(early.ok, false);
  assert.equal(!early.ok && early.locked, true);
  assert.equal(activityAvailability(celeb, ctx({ careerStage: 'superstar' })).ok, true);

  const diss = getLifeActivity('public-diss')!;
  assert.equal(activityAvailability(diss, ctx()).ok, false);
  assert.equal(activityAvailability(diss, ctx({ hasRival: true })).ok, true);

  const merch = getLifeActivity('merch-drop')!;
  assert.equal(activityAvailability(merch, ctx()).ok, false);
  assert.equal(
    activityAvailability(merch, ctx({ stats: { ...BASE_STATS, energy: 100, fans: 5_000 } })).ok,
    true
  );

  const tired = activityAvailability(
    getLifeActivity('open-mic')!,
    ctx({ stats: { ...BASE_STATS, energy: 5, fans: 0 } })
  );
  assert.deepEqual(tired, { ok: false, locked: false, reason: 'Too tired' });

  const broke = activityAvailability(getLifeActivity('therapy')!, ctx({ money: 10 }));
  assert.deepEqual(broke, { ok: false, locked: false, reason: 'Needs $250' });
});

test('the weekly cap and per-activity cooldowns block', () => {
  const gym = getLifeActivity('gym')!;
  const full = activityAvailability(gym, ctx({ doneThisWeek: ACTIVITIES_PER_WEEK }));
  assert.deepEqual(full, { ok: false, locked: false, reason: 'No time left this week' });

  const invest = getLifeActivity('invest')!; // cooldown 4
  assert.deepEqual(activityAvailability(invest, ctx({ lastDone: { invest: 9 } })), {
    ok: false,
    locked: false,
    reason: 'Again in 3 weeks',
  });
  assert.equal(activityAvailability(invest, ctx({ lastDone: { invest: 6 } })).ok, true);
});

// ─── Resolution ─────────────────────────────────────────────────────────────

test('skill tilts good outcomes up and bad ones down', () => {
  const mic = getLifeActivity('open-mic')!;
  const good = mic.outcomes.find((o) => o.luck === 'good')!;
  const bad = mic.outcomes.find((o) => o.luck === 'bad')!;
  const neutral = mic.outcomes.find((o) => !o.luck)!;
  const at = (charisma: number) => ({ ...BASE_STATS, charisma });

  assert.ok(effectiveWeight(good, mic, at(90)) > effectiveWeight(good, mic, at(10)));
  assert.ok(effectiveWeight(bad, mic, at(90)) < effectiveWeight(bad, mic, at(10)));
  assert.equal(effectiveWeight(neutral, mic, at(90)), neutral.weight);
});

test('pickOutcome walks the weights with the given roll', () => {
  const invest = getLifeActivity('invest')!; // no skill: raw weights 4,3,3,1
  assert.equal(pickOutcome(invest, BASE_STATS as never, () => 0).id, 'up');
  assert.equal(pickOutcome(invest, BASE_STATS as never, () => 0.999).id, 'moon');
});

test('earnings are capped per week and the money cost is folded in', () => {
  const invest = getLifeActivity('invest')!;
  const moon = () => 0.999; // +3,000 gross, costs 1,000

  const fresh = resolveActivity(invest, ctx(), TOKENS, moon);
  assert.equal(fresh.earned, ACTIVITY_EARNINGS_CAP_PER_WEEK);
  assert.equal(fresh.consequences.moneyDelta, ACTIVITY_EARNINGS_CAP_PER_WEEK - 1_000);

  const capped = resolveActivity(
    invest,
    ctx({ earnedThisWeek: ACTIVITY_EARNINGS_CAP_PER_WEEK }),
    TOKENS,
    moon
  );
  assert.equal(capped.earned, 0);
  assert.equal(capped.consequences.moneyDelta, -1_000, 'nothing earned, cost still paid');
});

test('no single activity can earn past the weekly cap, even every outcome at once', () => {
  let total = 0;
  for (const a of LIFE_ACTIVITIES) {
    for (let i = 0; i < a.outcomes.length; i++) {
      const roll = () => (i + 0.5) / a.outcomes.length;
      const r = resolveActivity(a, ctx({ earnedThisWeek: total }), TOKENS, roll);
      total += r.earned;
    }
  }
  assert.ok(total <= ACTIVITY_EARNINGS_CAP_PER_WEEK);
});

test('tokens are filled everywhere and hashtags come out as one word', () => {
  const fight: LifeActivity = getLifeActivity('start-fight')!;
  const arrested = resolveActivity(fight, ctx(), TOKENS, () => 0.999);
  assert.equal(arrested.outcome.id, 'arrested');
  assert.match(arrested.social!.text, /Nova Kay arrested/);
  assert.equal(arrested.social!.trend, 'FreeNovaKay');

  const diss = getLifeActivity('public-diss')!;
  const bodied = resolveActivity(diss, ctx({ hasRival: true }), TOKENS, () => 0);
  assert.equal(bodied.outcome.id, 'bodied');
  assert.match(bodied.line, /DJ Rook/);
  assert.match(bodied.consequences.historyRecord!.summary, /aimed at DJ Rook/);
  for (const text of [bodied.line, bodied.social!.text]) {
    assert.ok(!/\{(npc|playerName)\}/.test(text), text);
  }
});
