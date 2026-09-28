/**
 * LifeSim engine smoke tests — boots a world and simulates days of fully
 * autonomous life (the blueprint's Phase-1 milestone: leave sims alone and
 * they must survive). Pure core only; no React Native imports.
 *
 * Run: node --import tsx --test lifesim/__tests__/engine.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, activeLot } from '../core/world';
import { minuteTick } from '../core/engine';
import { MOTIVE_IDS, type Lot } from '../core/types';
import {
  findPath,
  applyBuildTool,
  placeObject,
  canPlaceObject,
  isWalkable,
  usePosition,
  objectTiles,
} from '../core/grid';
import { getDef } from '../data/catalog';
import { CAREER_TRACKS } from '../data/careers';

/** Flood-fill of walkable tiles reachable from the lot's street spawn. */
function reachableSet(lot: Lot): Set<number> {
  const seen = new Set<number>();
  const key = (x: number, y: number) => y * lot.w + x;
  const stack = [lot.spawn];
  seen.add(key(lot.spawn.x, lot.spawn.y));
  while (stack.length) {
    const { x, y } = stack.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      if (!isWalkable(lot, nx, ny)) continue;
      seen.add(k);
      stack.push({ x: nx, y: ny });
    }
  }
  return seen;
}

function freshWorld() {
  const world = createWorld({ name: 'Test Artist', householdName: 'Test Household' });
  world.rngState = 123456789; // deterministic run
  return world;
}

test('world boots with artist household, lots, and townies', () => {
  const world = freshWorld();
  assert.ok(world.playerHouseholdId, 'player household exists');
  const hh = world.households[world.playerHouseholdId!];
  assert.equal(hh.simIds.length, 1);
  assert.equal(world.sims[hh.simIds[0]].name, 'Test Artist');
  assert.ok(Object.keys(world.lots).length >= 6, 'neighborhood has lots');
  const lot = activeLot(world);
  assert.ok(lot, 'active lot set');
  assert.ok(Object.keys(lot!.objects).length > 10, 'starter home is furnished');
});

test('starter home: every object is reachable from the street (no sealed rooms)', () => {
  const world = freshWorld();
  const lot = activeLot(world)!;
  const reachable = reachableSet(lot);
  const key = (x: number, y: number) => y * lot.w + x;
  for (const obj of Object.values(lot.objects)) {
    const def = getDef(obj.defId);
    if (def.walkable) continue;
    // At least one approach tile (adjacent, or the object tile for sit-ons)
    // must be in the reachable region.
    const approach = usePosition(lot, obj, false) ?? usePosition(lot, obj, true);
    assert.ok(approach, `${def.name} has an approach tile`);
    const ok =
      reachable.has(key(approach!.x, approach!.y)) ||
      objectTiles(obj).some((t) => reachable.has(key(t.x, t.y)));
    assert.ok(ok, `${def.name} @${obj.x},${obj.y} is reachable from the street`);
  }
});

test('five autonomous sim-days: artist survives on free will alone', () => {
  const world = freshWorld();
  world.autonomy = 100;
  const artistId = world.households[world.playerHouseholdId!].simIds[0];

  for (let i = 0; i < 5 * 1440; i++) minuteTick(world);

  const artist = world.sims[artistId];
  assert.ok(artist, 'artist still exists');
  assert.equal(artist.dead, false, 'artist survived unattended');
  for (const m of MOTIVE_IDS) {
    assert.ok(Number.isFinite(artist.motives[m]), `${m} is a number`);
    assert.ok(artist.motives[m] >= -100 && artist.motives[m] <= 100, `${m} in range`);
  }
  // Not merely alive — actually coping (hunger managed most of the time).
  assert.ok(artist.motives.hunger > -80, `artist is fed (hunger ${artist.motives.hunger})`);
  assert.ok(world.day >= 6, 'time advanced');
  assert.ok(world.log.length > 0, 'events were logged');
});

test('pathfinding routes through the starter home doors', () => {
  const world = freshWorld();
  const lot = activeLot(world)!;
  // From the street into the bedroom (two doors deep).
  const path = findPath(lot, { x: 10, y: 16 }, { x: 5, y: 7 });
  assert.ok(path && path.length > 0, 'path found into the house');
});

test('build + buy operations charge and refund', () => {
  const world = freshWorld();
  const lot = activeLot(world)!;
  const wall = applyBuildTool(world, lot, 'wall', 1, 1, 2, 10000);
  assert.equal(wall.ok, true);
  assert.ok(wall.cost > 0);
  const door = applyBuildTool(world, lot, 'door', 1, 1, 2, 10000);
  assert.equal(door.ok, true);
  const chairDef = getDef('chair_dining');
  assert.equal(canPlaceObject(lot, chairDef, 1, 1), false, 'cannot place on wall');
  const placed = placeObject(world, lot, 'chair_dining', 18, 2);
  assert.ok(placed, 'chair placed on open ground');
});

test('career data is coherent (10 tracks × 10 levels)', () => {
  const tracks = Object.values(CAREER_TRACKS);
  assert.equal(tracks.length, 10);
  for (const track of tracks) {
    assert.equal(track.levels.length, 10);
    for (let i = 1; i < 10; i++) {
      assert.ok(
        track.levels[i].salary > track.levels[i - 1].salary,
        `${track.id} salaries rise`
      );
    }
  }
});
