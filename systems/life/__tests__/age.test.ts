import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ageAtWeek,
  birthdayBeat,
  birthdayLines,
  isBirthdayWeek,
  lifeStageForAge,
} from '../age';
import { LIFE_STAGES, STARTING_AGES } from '../../../data/life/lifeStages';
import { LIFE_EVENTS } from '../../../data/events/lifeEvents';
import { ALL_EVENTS } from '../../../data/events';
import { checkTrigger, type EventContext } from '../../events/eventEngine';
import { MIN_START_AGE, WEEKS_PER_YEAR } from '../../../constants/gameConfig';
import type { EventTrigger } from '../../../types/events';

test('age starts at startAge and ticks up every WEEKS_PER_YEAR weeks', () => {
  assert.equal(ageAtWeek(21, 1), 21);
  assert.equal(ageAtWeek(21, WEEKS_PER_YEAR), 21);
  assert.equal(ageAtWeek(21, WEEKS_PER_YEAR + 1), 22);
  assert.equal(ageAtWeek(21, 10 * WEEKS_PER_YEAR + 1), 31);
  // Explicit year length, independent of the tuning constant.
  assert.equal(ageAtWeek(18, 52, 52), 18);
  assert.equal(ageAtWeek(18, 53, 52), 19);
  // Never goes below the start age, even for a bogus week.
  assert.equal(ageAtWeek(25, 0), 25);
});

test('birthdays land exactly on the week the age changes', () => {
  assert.equal(isBirthdayWeek(1), false);
  for (let week = 2; week <= 5 * WEEKS_PER_YEAR + 1; week++) {
    const changed = ageAtWeek(20, week) !== ageAtWeek(20, week - 1);
    assert.equal(isBirthdayWeek(week), changed, `week ${week}`);
  }
});

test('life stages tile every age from the youngest start with no gaps', () => {
  assert.equal(LIFE_STAGES[0].minAge, MIN_START_AGE);
  for (let i = 1; i < LIFE_STAGES.length; i++) {
    assert.equal(LIFE_STAGES[i].minAge, LIFE_STAGES[i - 1].maxAge + 1);
  }
  assert.equal(LIFE_STAGES[LIFE_STAGES.length - 1].maxAge, Infinity);
  assert.equal(lifeStageForAge(18).id, 'young');
  assert.equal(lifeStageForAge(24).id, 'young');
  assert.equal(lifeStageForAge(25).id, 'prime');
  assert.equal(lifeStageForAge(59).id, 'midlife');
  assert.equal(lifeStageForAge(104).id, 'elder');
});

test('a birthday that crosses a stage boundary announces the new stage', () => {
  const week = WEEKS_PER_YEAR + 1;
  assert.equal(birthdayBeat(24, week - 1), null);

  const crossing = birthdayBeat(24, week)!;
  assert.equal(crossing.age, 25);
  assert.equal(crossing.newStage?.id, 'prime');
  assert.deepEqual(birthdayLines(crossing), [
    'You turned 25.',
    crossing.newStage!.arrival,
  ]);

  const ordinary = birthdayBeat(21, week)!;
  assert.equal(ordinary.newStage, null);
  assert.deepEqual(birthdayLines(ordinary), ['You turned 22.']);
});

test('every starting age is at least the minimum', () => {
  for (const s of STARTING_AGES) assert.ok(s.age >= MIN_START_AGE, s.label);
});

// ─── Life events ────────────────────────────────────────────────────────────

const AGE_TRIGGERS = new Set(['age_gte', 'age_lte', 'life_stage']);

function ageCtx(age: number): EventContext {
  return { age, lifeStage: lifeStageForAge(age).id } as EventContext;
}

function ageGatesPass(triggers: EventTrigger[], age: number): boolean {
  return triggers
    .filter((t) => AGE_TRIGGERS.has(t.type))
    .every((t) => checkTrigger(t, ageCtx(age)));
}

test('there are 15+ life events and each one is age-gated', () => {
  assert.ok(LIFE_EVENTS.length >= 15, `only ${LIFE_EVENTS.length}`);
  for (const e of LIFE_EVENTS) {
    assert.ok(
      e.triggers.some((t) => AGE_TRIGGERS.has(t.type)),
      `${e.id} has no age trigger`
    );
    for (const t of e.triggers) {
      if (t.type === 'life_stage') {
        assert.ok(
          LIFE_STAGES.some((s) => s.id === t.lifeStage),
          `${e.id} names unknown stage ${t.lifeStage}`
        );
      }
    }
  }
});

test('every life event can fire at some reachable age', () => {
  for (const e of LIFE_EVENTS) {
    const reachable = Array.from({ length: 80 }, (_, i) => MIN_START_AGE + i).some(
      (age) => ageGatesPass(e.triggers, age)
    );
    assert.ok(reachable, `${e.id}'s age gates can never all pass`);
  }
});

test('age gates actually exclude the wrong ages', () => {
  const twentyFirst = LIFE_EVENTS.find((e) => e.id === 'life-twenty-first')!;
  assert.equal(ageGatesPass(twentyFirst.triggers, 20), false);
  assert.equal(ageGatesPass(twentyFirst.triggers, 21), true);
  assert.equal(ageGatesPass(twentyFirst.triggers, 22), false);

  const unc = LIFE_EVENTS.find((e) => e.id === 'life-called-unc')!;
  assert.equal(ageGatesPass(unc.triggers, 34), false);
  assert.equal(ageGatesPass(unc.triggers, 35), true);
  assert.equal(ageGatesPass(unc.triggers, 45), false);
});

test('event ids are unique across the whole catalog', () => {
  const seen = new Set<string>();
  for (const e of ALL_EVENTS) {
    assert.ok(!seen.has(e.id), `duplicate event id ${e.id}`);
    seen.add(e.id);
  }
});
