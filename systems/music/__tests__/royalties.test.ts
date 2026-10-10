import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '../../../types/music';
import { buybackPrice, heldMasters, INDIE_SHARE, ownedCatalogWeekly, STREAM_RATE, trackRoyalty, weeklyRoyalties } from '../royalties';
import { canStartLabel, LABEL_COST, ventureSaleValue, ventureWeek } from '../../mogul/mogulEngine';
import { VENTURES } from '../../../data/mogul/ventures';

function track(over: Partial<Track>): Track {
  return {
    id: 't',
    title: 't',
    type: 'single',
    genre: 'pop',
    releasedAtWeek: 1,
    quality: 60,
    replayValue: 60,
    originality: 60,
    mainstreamAppeal: 60,
    peakChartPosition: null,
    peakFans: 0,
    weeklyStreams: 1_000_000,
    totalStreams: 1_000_000,
    status: 'charting',
    wentViral: false,
    ...over,
  };
}

test('streams pay: independent keeps most, a label deal keeps a little', () => {
  const indie = track({ id: 'a' });
  const signed = track({ id: 'b', owner: 'label', royaltyShare: 0.15 });
  assert.equal(trackRoyalty(indie), Math.round(1_000_000 * STREAM_RATE * INDIE_SHARE));
  assert.equal(trackRoyalty(signed), Math.round(1_000_000 * STREAM_RATE * 0.15));
  const st = weeklyRoyalties([indie, signed]);
  assert.equal(st.total, trackRoyalty(indie) + trackRoyalty(signed));
  assert.equal(st.streams, 2_000_000);
  assert.ok(st.withheld > trackRoyalty(signed), 'the label keeps most of its song');
});

test('masters: held songs, a price for them, and re-recorded ones count as reclaimed', () => {
  const held = track({ id: 'h', owner: 'vault', royaltyShare: 0.15, peakChartPosition: 4 });
  const reclaimed = track({ id: 'r', owner: 'label', royaltyShare: 0.15, rerecorded: true });
  const own = track({ id: 'o', owner: 'artist' });
  assert.deepEqual(heldMasters([held, reclaimed, own]).map((t) => t.id), ['h']);
  assert.ok(buybackPrice([held]) >= 120_000, 'a top-10 master is expensive');
  assert.equal(buybackPrice([own]), 0);
  assert.equal(ownedCatalogWeekly([held, own]), trackRoyalty(own));
});

test('the mogul: a label has a bar to clear; a business swings with its stat', () => {
  assert.equal(canStartLabel(10_000, 3, 1_000_000, false).ok, false);
  assert.equal(canStartLabel(300_000, 3, LABEL_COST, false).ok, true);
  assert.equal(canStartLabel(300_000, 3, LABEL_COST, true).ok, false);
  const def = VENTURES[0];
  const v = { id: 'v', defId: def.id, startedWeek: 1, invested: def.cost, health: 50, lifetimeNet: 0, lastNet: 0, status: 'running' as const, badWeeks: 0 };
  const good = ventureWeek(v, def, { fans: 100_000, statValue: 90, tilt: 0 }, () => 0.5);
  const bad = ventureWeek(v, def, { fans: 100_000, statValue: 10, tilt: 0 }, () => 0.5);
  assert.ok(good.health > bad.health);
  assert.ok(good.net > bad.net);
  assert.ok(ventureSaleValue({ ...v, health: 100 }) > ventureSaleValue({ ...v, health: 0 }));
});
