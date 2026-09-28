import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAREER_STAGES } from '../../../constants/careerStages';

// Only the pure stage CONSTANTS are exercised here. `systems/career/careerStage`
// reads the zustand stores (→ expo-sqlite), which the node runner can't load;
// its trivial selection logic is covered by the full `tsc` typecheck.

test('CAREER_STAGES: the brief\'s six-stage ladder, in order', () => {
  assert.deepEqual(
    CAREER_STAGES.map((s) => s.id),
    ['novice', 'amateur', 'emerging', 'established', 'superstar', 'legend']
  );
});

test('CAREER_STAGES: level, fan, and collab-ceiling gates rise monotonically', () => {
  for (let i = 1; i < CAREER_STAGES.length; i++) {
    const prev = CAREER_STAGES[i - 1];
    const cur = CAREER_STAGES[i];
    assert.ok(cur.minLevel > prev.minLevel, `${cur.id} minLevel rises`);
    assert.ok(cur.minFans > prev.minFans, `${cur.id} minFans rises`);
    assert.ok(
      cur.unlocks.maxCollabFans > prev.unlocks.maxCollabFans,
      `${cur.id} collab ceiling rises`
    );
  }
});

test('CAREER_STAGES: novice starts at the floor', () => {
  assert.equal(CAREER_STAGES[0].minLevel, 1);
  assert.equal(CAREER_STAGES[0].minFans, 0);
});
