import test from 'node:test';
import assert from 'node:assert/strict';

import type { Npc, WorldState } from '../../../types/world';
import { Rng, hash32, hashString } from '../rng';
import { generateNpc, generateWorld } from '../generateNpc';
import { simulateWeek, simulateWeeks, cloneWorld, summarizeWorld } from '../worldEngine';
import { careerStageFor, fameLevel, opportunityScore, reach } from '../reputation';
import { overallSentiment } from '../relationships';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Stable scalar fingerprint of a world — used to prove reproducibility. */
function checksum(world: WorldState): number {
  let h = hash32(world.week, world.eventCount, world.retiredCount, world.npcIds.length);
  for (const id of world.npcIds) {
    const n = world.npcs[id];
    const r = n.reputation;
    h = hash32(
      h,
      Math.round(reach(n)),
      Math.round(n.momentum),
      n.active ? 1 : 0,
      Math.round(r.talent + r.authenticity + r.professionalism + r.marketability + r.influence),
      Object.keys(n.relationships).length,
    );
  }
  return h >>> 0;
}

const SEED = 0xc0ffee;

// ─── RNG ──────────────────────────────────────────────────────────────────────

test('Rng is deterministic for a given seed and varies across seeds', () => {
  const a = new Rng(SEED);
  const b = new Rng(SEED);
  const seqA = Array.from({ length: 50 }, () => a.next());
  const seqB = Array.from({ length: 50 }, () => b.next());
  assert.deepStrictEqual(seqA, seqB, 'same seed must reproduce the same stream');

  const c = new Rng(SEED + 1);
  const seqC = Array.from({ length: 50 }, () => c.next());
  assert.notDeepStrictEqual(seqA, seqC, 'different seeds should diverge');
});

test('Rng helpers respect their bounds', () => {
  const rng = new Rng(42);
  for (let i = 0; i < 1000; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1);
    const n = rng.int(3, 9);
    assert.ok(n >= 3 && n <= 9 && Number.isInteger(n));
    const f = rng.float(-2, 2);
    assert.ok(f >= -2 && f < 2);
  }
});

test('Rng.chance approximates the requested probability', () => {
  const rng = new Rng(7);
  let hits = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) if (rng.chance(0.3)) hits++;
  const p = hits / N;
  assert.ok(Math.abs(p - 0.3) < 0.02, `expected ~0.3, got ${p}`);
});

test('hash32 / hashString are stable and well-mixed', () => {
  assert.equal(hash32(1, 2, 3), hash32(1, 2, 3));
  assert.notEqual(hash32(1, 2, 3), hash32(3, 2, 1));
  assert.equal(hashString('blaze-omen'), hashString('blaze-omen'));
  assert.notEqual(hashString('blaze'), hashString('nova'));
});

// ─── Generation ────────────────────────────────────────────────────────────────

test('generateWorld is fully deterministic for a seed', () => {
  const w1 = generateWorld(SEED);
  const w2 = generateWorld(SEED);
  assert.deepStrictEqual(w1, w2, 'same seed must produce an identical world');

  const w3 = generateWorld(SEED + 1);
  assert.notEqual(checksum(w1), checksum(w3), 'different seeds should differ');
});

test('generated NPCs carry role-appropriate data', () => {
  const w = generateWorld(SEED);
  const npcs = w.npcIds.map((id) => w.npcs[id]);

  const artist = npcs.find((n) => n.role === 'artist')!;
  assert.equal(typeof artist.roleData.fans, 'number');
  assert.ok(artist.goals.length >= 1);

  const label = npcs.find((n) => n.role === 'label')!;
  assert.ok(Array.isArray(label.roleData.roster));
  assert.equal(typeof label.roleData.budget, 'number');

  const journalist = npcs.find((n) => n.role === 'journalist')!;
  assert.equal(typeof journalist.roleData.bias, 'number');

  const fan = npcs.find((n) => n.role === 'fan-community')!;
  assert.equal(typeof fan.roleData.patronId, 'string');
  assert.ok(w.npcs[fan.roleData.patronId!], 'fan community points at a real artist');
});

test('generateNpc clamps all stats into valid ranges', () => {
  for (let s = 0; s < 200; s++) {
    const npc = generateNpc({ rng: new Rng(hash32(s, 99)), id: `t-${s}`, role: 'artist', week: 0 });
    for (const v of Object.values(npc.personality)) assert.ok(v >= 0 && v <= 100);
    for (const v of Object.values(npc.reputation)) assert.ok(v >= 0 && v <= 100);
    assert.ok(npc.health.mental >= 0 && npc.health.mental <= 100);
    assert.ok(npc.momentum >= -100 && npc.momentum <= 100);
  }
});

// ─── Simulation determinism & purity ──────────────────────────────────────────

test('simulateWeek does not mutate its input (purity)', () => {
  const world = generateWorld(SEED);
  const snapshot = JSON.stringify(world);
  const { world: next } = simulateWeek(world);
  assert.equal(JSON.stringify(world), snapshot, 'input world must be untouched');
  assert.notEqual(next, world, 'a new world object must be returned');
  assert.equal(next.week, world.week + 1);
});

test('a full year of simulation is reproducible to the bit', () => {
  const a = simulateWeeks(generateWorld(SEED), 52);
  const b = simulateWeeks(generateWorld(SEED), 52);
  assert.deepStrictEqual(a, b, '52 weeks from the same seed must be identical');
  // Pinned snapshot — locks the deterministic behavior of the engine.
  const sum = checksum(a);
  console.log('[snapshot] 52-week checksum =', sum);
  assert.equal(sum, EXPECTED_52_WEEK_CHECKSUM);
});

test('different seeds produce different histories', () => {
  const a = simulateWeeks(generateWorld(SEED), 26);
  const b = simulateWeeks(generateWorld(SEED + 12345), 26);
  assert.notEqual(checksum(a), checksum(b));
});

// ─── Emergent behavior ─────────────────────────────────────────────────────────

test('events emerge organically across a simulated year', () => {
  let world = generateWorld(SEED);
  const typeCounts = new Map<string, number>();
  let totalEvents = 0;
  for (let i = 0; i < 52; i++) {
    const { world: next, events } = simulateWeek(world);
    world = next;
    for (const e of events) {
      typeCounts.set(e.type, (typeCounts.get(e.type) ?? 0) + 1);
      totalEvents++;
    }
  }
  console.log('[snapshot] event type spread =', Object.fromEntries(typeCounts));
  assert.ok(totalEvents > 100, `expected a lively world, got ${totalEvents} events`);
  // A living world should exercise many different kinds of story.
  assert.ok(typeCounts.size >= 7, `expected variety, saw ${typeCounts.size} event types`);
  assert.ok((typeCounts.get('release') ?? 0) > 0, 'artists should release music');
  assert.ok((typeCounts.get('collaboration') ?? 0) > 0, 'artists should collaborate');
  assert.ok(
    (typeCounts.get('feud-started') ?? 0) + (typeCounts.get('diss-track') ?? 0) > 0,
    'rivalries should flare up',
  );
});

test('relationships evolve into real bonds and rivalries', () => {
  const world = simulateWeeks(generateWorld(SEED), 40);
  let rivals = 0;
  let friends = 0;
  let romances = 0;
  let extremeSentiment = false;
  for (const id of world.npcIds) {
    for (const rel of Object.values(world.npcs[id].relationships)) {
      if (rel.dims.rivalry > 40) rivals++;
      if (rel.dims.friendship > 40) friends++;
      if (rel.status === 'dating' || rel.status === 'ex') romances++;
      if (Math.abs(overallSentiment(rel.dims)) > 60) extremeSentiment = true;
    }
  }
  console.log('[snapshot] rivals/friends/romances =', rivals, friends, romances);
  assert.ok(rivals > 0, 'rivalries should form');
  assert.ok(friends > 0, 'friendships should form');
  assert.ok(extremeSentiment, 'some relationships should become intense');
});

test('careers progress, decline and end over a long run', () => {
  const world = simulateWeeks(generateWorld(SEED), 250);
  const stages = new Map<string, number>();
  for (const id of world.npcIds) {
    const s = world.npcs[id].stage;
    stages.set(s, (stages.get(s) ?? 0) + 1);
  }
  console.log('[snapshot] retiredCount =', world.retiredCount, 'stages =', Object.fromEntries(stages));
  assert.ok(world.retiredCount > 0, 'some NPCs should retire over 250 weeks');
  assert.ok((stages.get('retired') ?? 0) === world.retiredCount);
});

// ─── Invariants hold under long simulation ────────────────────────────────────

test('all stats stay within their declared ranges after long simulation', () => {
  const world = simulateWeeks(generateWorld(SEED), 120);
  for (const id of world.npcIds) {
    const n = world.npcs[id];
    for (const v of Object.values(n.reputation)) assert.ok(v >= 0 && v <= 100, `reputation out of range: ${v}`);
    assert.ok(n.momentum >= -100 && n.momentum <= 100);
    for (const k of ['physical', 'mental', 'burnout', 'addiction'] as const) {
      assert.ok(n.health[k] >= 0 && n.health[k] <= 100, `health.${k} out of range: ${n.health[k]}`);
    }
    assert.ok(n.social.controversyHeat >= 0 && n.social.controversyHeat <= 100);
    for (const rel of Object.values(n.relationships)) {
      for (const k of ['friendship', 'trust', 'respect', 'attraction'] as const) {
        assert.ok(rel.dims[k] >= -100 && rel.dims[k] <= 100, `${k} out of range: ${rel.dims[k]}`);
      }
      assert.ok(rel.dims.resentment >= 0 && rel.dims.resentment <= 100);
      assert.ok(rel.dims.rivalry >= 0 && rel.dims.rivalry <= 100);
    }
  }
});

// ─── Reputation / opportunity model ────────────────────────────────────────────

test('fameLevel is monotonic and opportunityScore reads reputation', () => {
  assert.ok(fameLevel(100) < fameLevel(100_000));
  assert.ok(fameLevel(100_000) < fameLevel(10_000_000));
  assert.ok(fameLevel(0) === 0);

  const base = generateNpc({ rng: new Rng(1), id: 'a', role: 'artist', week: 0 });
  base.reputation = { talent: 90, authenticity: 90, professionalism: 90, marketability: 90, influence: 90 };
  base.roleData.fans = 1_000_000;
  const strong = opportunityScore(base, 'award-worthiness');

  const weak: Npc = cloneWorld({ seed: 0, week: 0, npcs: { a: base }, npcIds: ['a'], events: [], eventCount: 0, retiredCount: 0 }).npcs.a;
  weak.reputation = { talent: 10, authenticity: 10, professionalism: 10, marketability: 10, influence: 10 };
  assert.ok(strong > opportunityScore(weak, 'award-worthiness'));
});

test('careerStageFor reflects audience size', () => {
  const mk = (fans: number): Npc => {
    const n = generateNpc({ rng: new Rng(fans), id: 'x', role: 'artist', week: 0 });
    n.roleData.fans = fans;
    n.momentum = 0;
    return n;
  };
  assert.equal(careerStageFor(mk(200)), 'undiscovered');
  assert.equal(careerStageFor(mk(10_000)), 'rising');
  assert.equal(careerStageFor(mk(200_000)), 'established');
  assert.equal(careerStageFor(mk(2_000_000)), 'star');
  assert.equal(careerStageFor(mk(20_000_000)), 'legend');
});

// ─── Performance: thousands of NPCs ────────────────────────────────────────────

test('simulates a world of 3000+ NPCs within a sane time budget', () => {
  const big = generateWorld(SEED, {
    artists: 1800,
    influencers: 500,
    journalists: 120,
    labels: 80,
    producers: 300,
    fanCommunities: 600,
  });
  assert.ok(big.npcIds.length >= 3000, `expected 3000+ NPCs, got ${big.npcIds.length}`);

  const start = Date.now();
  const { world } = simulateWeek(big);
  const elapsed = Date.now() - start;
  console.log(`[perf] one week of ${big.npcIds.length} NPCs took ${elapsed}ms`);
  assert.ok(elapsed < 5000, `one week took too long: ${elapsed}ms`);
  assert.equal(world.week, big.week + 1);
  assert.ok(summarizeWorld(world).activeNpcs > 0);
});

// Pinned by running the suite once; locks deterministic behavior in place.
// If a deliberate engine change shifts this, re-capture from the test log.
const EXPECTED_52_WEEK_CHECKSUM = 2075705364;
