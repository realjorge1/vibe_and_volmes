import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlan, type ResolveContext } from '../planEngine';
import { PASSIVE_CONFIG } from '../../../constants/passiveConfig';
import type { Player } from '../../../types/player';
import type { DayPlan } from '../../../types/passive';

// planEngine is pure (data + utils only), so it runs under the node test runner.

function fakePlayer(): Player {
  return {
    id: 'p',
    artistName: 'Tester',
    realName: 'T',
    gender: 'nonbinary',
    genre: 'hip-hop',
    city: 'NYC',
    archetype: 'street-hustler',
    money: 0,
    week: 1,
    createdAt: Date.now(),
    stats: {
      talent: 50,
      writing: 50,
      vocalSkill: 50,
      charisma: 50,
      authenticity: 50,
      creativity: 50,
      discipline: 50,
      reputation: 50,
      fans: 1000,
      fanLoyalty: 50,
      industryRespect: 50,
      mentalHealth: 50,
      energy: 50,
    },
  };
}

// A high-earning, grind-heavy plan to stress every channel.
const PLAN: DayPlan = {
  slots: ['promotion', 'press', 'studio', 'networking'],
  updatedAt: 0,
};

function ctx(): ResolveContext {
  return {
    knownArtists: [{ id: 'rival-1', name: 'Rival' }],
    storylines: [],
    boostActivities: new Set(['promotion', 'press', 'studio', 'networking']), // worst-case boost
    now: Date.now(),
  };
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

test('resolvePlan caps resolved slots no matter how long the absence', () => {
  const { outcome } = resolvePlan(fakePlayer(), PLAN, YEAR_MS, ctx());
  assert.ok(
    outcome.resolvedSlots <= PASSIVE_CONFIG.MAX_RESOLVED_SLOTS,
    `resolvedSlots ${outcome.resolvedSlots}`
  );
});

test('resolvePlan bounds every channel across 1000 randomized runs', () => {
  for (let i = 0; i < 1000; i++) {
    const { outcome } = resolvePlan(fakePlayer(), PLAN, YEAR_MS, ctx());

    assert.ok(
      outcome.earnings >= 0 && outcome.earnings <= PASSIVE_CONFIG.MAX_EARN_PER_RESUME,
      `earnings ${outcome.earnings}`
    );

    for (const s of outcome.statChanges) {
      assert.ok(
        Math.abs(s.delta) <= PASSIVE_CONFIG.MAX_STAT_NUDGE,
        `stat ${String(s.stat)} delta ${s.delta}`
      );
    }

    const xp = outcome.xpGrants.reduce((sum, g) => sum + g.amount, 0);
    // +N rounding slack across the distinct sources.
    assert.ok(
      xp <= PASSIVE_CONFIG.MAX_PASSIVE_XP + outcome.xpGrants.length + 1,
      `xp ${xp}`
    );

    for (const a of outcome.affinityChanges) {
      assert.ok(
        Math.abs(a.delta) <= PASSIVE_CONFIG.MAX_AFFINITY_NUDGE,
        `affinity ${a.delta}`
      );
    }

    assert.ok(
      outcome.fanDriftMult >= 0.8 && outcome.fanDriftMult <= 2.0,
      `fanDriftMult ${outcome.fanDriftMult}`
    );
  }
});

test('a sub-slot absence resolves nothing (no fake gains)', () => {
  const { outcome } = resolvePlan(fakePlayer(), PLAN, 60 * 1000, ctx());
  assert.equal(outcome.resolvedSlots, 0);
  assert.equal(outcome.earnings, 0);
  assert.equal(outcome.statChanges.length, 0);
});
