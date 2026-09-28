import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '../../../types/music';
import {
  streamScore,
  computeChartScore,
  chartPositionFromScore,
  updateWeeklyCharts,
  type ChartContext,
} from '../chartEngine';

// chartEngine is pure (types + clamp only), so it's safe under the node runner.

const ZERO = {
  socialBuzz: 0,
  playlistSupport: 0,
  trendAlignment: 0,
  labelBacking: 0,
  reputation: 0,
};

test('streamScore: monotonic and bounded 0-100', () => {
  assert.equal(streamScore(0), 0);
  assert.ok(streamScore(1_000) < streamScore(1_000_000));
  assert.ok(streamScore(50_000_000) <= 100);
  assert.ok(streamScore(50_000_000) >= 99); // saturates near the top
});

test('computeChartScore: bounded, and streams are the dominant factor', () => {
  const none = computeChartScore({ weeklyStreams: 0, ...ZERO }).score;
  assert.equal(none, 0);

  const all = computeChartScore({
    weeklyStreams: 50_000_000,
    socialBuzz: 100,
    playlistSupport: 100,
    trendAlignment: 100,
    labelBacking: 100,
    reputation: 100,
  }).score;
  assert.ok(all > 95 && all <= 100);

  // Maxing streams alone must move the score more than maxing any other single
  // factor — streams carry the largest weight.
  const streamsOnly = computeChartScore({ weeklyStreams: 50_000_000, ...ZERO })
    .score;
  const buzzOnly = computeChartScore({
    weeklyStreams: 0,
    ...ZERO,
    socialBuzz: 100,
  }).score;
  assert.ok(streamsOnly > buzzOnly);
});

test('computeChartScore: factors breakdown is normalized 0-100', () => {
  const { factors } = computeChartScore({
    weeklyStreams: 500_000,
    socialBuzz: 60,
    playlistSupport: 40,
    trendAlignment: 55,
    labelBacking: 30,
    reputation: 70,
  });
  for (const v of Object.values(factors)) {
    assert.ok(v >= 0 && v <= 100);
  }
  assert.equal(factors.socialBuzz, 60);
});

test('chartPositionFromScore: off-chart below threshold, better with higher score', () => {
  assert.equal(chartPositionFromScore(10), null);
  assert.equal(chartPositionFromScore(85), 1);

  let prev = Infinity;
  for (const s of [30, 40, 50, 60, 70, 80, 90]) {
    const pos = chartPositionFromScore(s);
    assert.ok(pos !== null);
    assert.ok((pos as number) <= prev); // higher score → equal-or-better rank
    prev = pos as number;
  }
});

function makeTrack(over: Partial<Track> = {}): Track {
  return {
    id: 't1',
    title: 'Test',
    type: 'single',
    genre: 'pop',
    releasedAtWeek: 1,
    quality: 70,
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

test('updateWeeklyCharts: decays streams and accumulates totals', () => {
  const t = makeTrack();
  const { tracks } = updateWeeklyCharts([t], 2);
  assert.equal(tracks.length, 1);
  assert.ok(tracks[0].weeklyStreams < t.weeklyStreams); // decayed
  assert.ok(tracks[0].totalStreams > t.totalStreams); // accumulated
});

test('updateWeeklyCharts: leaves classic/forgotten tracks untouched', () => {
  const classic = makeTrack({ id: 'c', status: 'classic', weeklyStreams: 5 });
  const { tracks } = updateWeeklyCharts([classic], 5);
  assert.deepEqual(tracks[0], classic);
});

test('updateWeeklyCharts: ctx makes label/trend/reputation lift the position', () => {
  const t = makeTrack({ producerReputation: 80, marketingSeed: 80 });
  const strongCtx: ChartContext = {
    reputation: 90,
    labelBacking: 90,
    trendAlignment: 90,
    buzzForTrack: () => 90,
  };
  const weakCtx: ChartContext = {
    reputation: 0,
    labelBacking: 0,
    trendAlignment: 0,
    buzzForTrack: () => 0,
  };
  const strong = updateWeeklyCharts([t], 2, strongCtx);
  const weak = updateWeeklyCharts([t], 2, weakCtx);
  const sPos = strong.entries[0]?.position ?? 101;
  const wPos = weak.entries[0]?.position ?? 101;
  assert.ok(sPos <= wPos); // more support → equal-or-better chart position
});
