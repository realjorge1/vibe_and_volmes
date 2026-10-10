import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Track } from '../../../types/music';
import type { Player } from '../../../types/player';
import { BASE_STATS } from '../../../constants/gameConfig';
import {
  openingShare,
  planRelease,
  stepRelease,
  rollBreakout,
  releaseProgressNote,
  releasePulse,
} from '../releaseCurve';
import { simulateRelease } from '../musicEngine';
import { updateWeeklyCharts } from '../../charts/chartEngine';

function makeTrack(over: Partial<Track> = {}): Track {
  return {
    id: 't1',
    title: 'Slow Burn',
    type: 'single',
    genre: 'pop',
    releasedAtWeek: 1,
    quality: 80,
    replayValue: 80,
    originality: 80,
    mainstreamAppeal: 70,
    peakChartPosition: null,
    peakFans: 0,
    weeklyStreams: 0,
    totalStreams: 0,
    status: 'charting',
    wentViral: false,
    ...over,
  };
}

function makePlayer(fans: number): Player {
  return {
    id: 'p1',
    artistName: 'Test Artist',
    realName: 'Test',
    gender: 'female',
    genre: 'pop',
    city: 'Atlanta',
    archetype: 'indie-dreamer',
    money: 0,
    week: 1,
    createdAt: 0,
    startAge: 21,
    stats: { ...BASE_STATS, fans },
  };
}

/** A track as it leaves release day, `opening` weekly streams in. */
function released(fans: number, opening: number, over: Partial<Track> = {}): Track {
  const t = makeTrack(over);
  const plan = planRelease({ fans, track: t, conversion: 0.04, viralMult: 1, breakoutChance: 0 });
  return { ...t, weeklyStreams: opening, totalStreams: opening, momentum: plan.momentum };
}

test('openingShare: an unknown opens small, a superstar front-loads', () => {
  assert.ok(openingShare(0) < 0.05);
  assert.ok(openingShare(20_000) < 0.12);
  assert.ok(openingShare(5_000_000) > 0.8);
  let prev = 0;
  for (const fans of [0, 1_000, 10_000, 100_000, 1_000_000, 10_000_000]) {
    assert.ok(openingShare(fans) > prev, 'more fame → more of the audience on day one');
    prev = openingShare(fans);
  }
});

test('planRelease: unknowns and better songs build longer', () => {
  const song = makeTrack();
  const plan = (fans: number, q = 80) =>
    planRelease({
      fans,
      track: { quality: q, replayValue: q, originality: q },
      conversion: 0.04,
      viralMult: 1,
      breakoutChance: 0,
    }).momentum;
  assert.ok(plan(0).buildWeeks > plan(5_000_000).buildWeeks, 'unknown builds longer');
  assert.ok(plan(0, 90).buildWeeks > plan(0, 30).buildWeeks, 'a better song builds longer');
  assert.ok(plan(0).growth > 1, 'a building song grows');
  assert.ok(plan(0).fansPerStream > plan(5_000_000).fansPerStream, 'existing fans are not new fans');
  assert.equal(plan(0).breakoutChance, 0);
  assert.ok(
    planRelease({ fans: 0, track: song, conversion: 0.04, viralMult: 1, breakoutChance: 0.05 })
      .momentum.breakoutChance > 0
  );
});

test("an upcoming artist's song climbs for weeks, then fades", () => {
  let t = released(1_000, 500);
  const weekly = [t.weeklyStreams];
  let fans = 0;
  for (let w = 1; w <= t.momentum!.buildWeeks + 2; w++) {
    const step = stepRelease({ ...t, momentum: t.momentum! }, w);
    t = { ...t, weeklyStreams: step.weeklyStreams, momentum: step.momentum };
    weekly.push(step.weeklyStreams);
    fans += step.fansWon;
  }
  const b = t.momentum!.buildWeeks;
  for (let w = 1; w <= b; w++) assert.ok(weekly[w] > weekly[w - 1], `week ${w} grows`);
  assert.ok(weekly[b + 1] < weekly[b], 'fades after the peak');
  assert.ok(weekly[b] > weekly[0] * 5, 'the peak is well above release week');
  assert.ok(fans > 0, 'fans arrive week by week');
});

test('stepRelease: a growing artist lifts the song, capped', () => {
  const t = released(10_000, 20_000);
  const flat = stepRelease({ ...t, momentum: t.momentum! }, 1, 10_000);
  const grown = stepRelease({ ...t, momentum: t.momentum! }, 1, 100_000);
  const huge = stepRelease({ ...t, momentum: t.momentum! }, 1, 100_000_000);
  assert.ok(grown.weeklyStreams > flat.weeklyStreams);
  assert.ok(huge.weeklyStreams <= Math.round(flat.weeklyStreams * 1.2) + 1, 'lift is capped');
  assert.equal(grown.momentum.audienceFans, 100_000);
});

test('rollBreakout: only while building, only once', () => {
  const t = { ...released(0, 200), momentum: { ...released(0, 200).momentum!, breakoutChance: 0.3 } };
  assert.equal(rollBreakout(t, 1, () => 0.99), null, 'missed roll');
  const broke = rollBreakout(t, 1, () => 0);
  assert.ok(broke && broke.wentViral);
  assert.ok(broke!.momentum!.growth > t.momentum.growth, 'breaking out speeds the climb');
  assert.equal(rollBreakout(broke!, 2, () => 0), null, 'no second breakout');
  assert.equal(rollBreakout(t, t.momentum.buildWeeks + 1, () => 0), null, 'not once it fades');
  const established = released(2_000_000, 1_000_000);
  assert.equal(rollBreakout(established, 1, () => 0), null, 'no breakout chance planned');
});

test('simulateRelease: an unknown opens small, off the chart, critics first', () => {
  const player = makePlayer(0);
  for (let i = 0; i < 25; i++) {
    const r = simulateRelease(player, makeTrack({ quality: 95, replayValue: 95, originality: 95 }), {
      streamMultiplier: 2,
      chartFactors: {
        socialBuzz: 80,
        playlistSupport: 80,
        trendAlignment: 80,
        labelBacking: 80,
        reputation: 80,
      },
    });
    assert.ok(r.streamCount < 1_500, `release week stays small (${r.streamCount})`);
    assert.equal(r.chartPosition, null, 'nobody charts on day one');
    assert.ok(r.fansGained < 50, `a handful of fans on day one (${r.fansGained})`);
    assert.ok(r.reception !== 'smash' && r.reception !== 'viral', 'no day-one smash for an unknown');
    assert.ok(r.track.momentum && r.track.momentum.buildWeeks >= 3, 'a slow burn ahead');
    assert.equal(r.track.criticsScore, r.criticsScore);
  }
});

test('simulateRelease: a superstar still debuts big', () => {
  const r = simulateRelease(makePlayer(5_000_000), makeTrack());
  assert.ok(r.streamCount > 10_000_000);
  assert.ok(r.chartPosition !== null && r.chartPosition <= 20);
});

test('updateWeeklyCharts: a building song is kept alive and wins fans', () => {
  const t = released(0, 300, { releasedAtWeek: 1 });
  const { tracks, fansGained } = updateWeeklyCharts([t], 2);
  assert.equal(tracks[0].status, 'charting', 'small numbers do not write it off while it builds');
  assert.ok(tracks[0].weeklyStreams > t.weeklyStreams, 'it grows');
  assert.ok(fansGained > 0);
  assert.equal(tracks[0].fansEarned, fansGained);
});

test('releaseProgressNote / releasePulse describe the climb', () => {
  const prev = released(0, 1_000);
  const grew = { ...prev, weeklyStreams: 2_500 };
  assert.equal(releaseProgressNote(prev, grew, null, 30)?.kind, 'building');
  assert.equal(releaseProgressNote(prev, grew, 90, 30)?.kind, 'entry');
  assert.equal(
    releaseProgressNote({ ...prev, peakChartPosition: 90 }, grew, 55, 30)?.kind,
    'peak'
  );
  assert.equal(releaseProgressNote(prev, { ...grew, wentViral: true }, 90, 30)?.kind, 'breakout');
  assert.equal(releaseProgressNote(grew, prev, null, 0), null, 'nothing to say about a dip');
  assert.equal(releaseProgressNote(makeTrack(), makeTrack(), 10, 0), null, 'legacy tracks stay quiet');

  assert.match(releasePulse(prev, 2) ?? '', /^Still building/);
  assert.match(releasePulse(prev, 1 + prev.momentum!.buildWeeks) ?? '', /^Fading/);
});
