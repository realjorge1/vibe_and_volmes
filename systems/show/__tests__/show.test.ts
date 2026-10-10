import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ShowSong } from '../../../types/show';
import {
  barAt,
  beatInBar,
  cuesForSong,
  finalScore,
  gradeOffset,
  judgeSetlist,
  offsetToBar,
  resolveStageOption,
  segmentSeconds,
  showFans,
  songEnergy,
  starsFor,
} from '../showEngine';
import { STAGE_MOMENTS, stageMomentsFor } from '../../../data/show/stageMoments';
import { BASE_STATS } from '../../../constants/gameConfig';

const song = (id: string, heat: number, bpm: number): ShowSong => ({
  trackId: id,
  title: id,
  heat,
  energy: songEnergy(bpm),
  bpm,
  beatId: null,
  vocalUri: null,
});

test('the beat grid: 120 BPM is half a second a beat, two seconds a bar', () => {
  assert.equal(beatInBar(0.4, 120), 0);
  assert.equal(beatInBar(0.6, 120), 1);
  assert.equal(barAt(4.1, 120), 2);
  assert.equal(segmentSeconds(120), 16);
  assert.equal(Math.round(offsetToBar(8.05, 120, 4)), 50);
  assert.equal(Math.round(offsetToBar(7.9, 120, 4)), -100);
});

test('timing grades are symmetric and strict', () => {
  assert.equal(gradeOffset(40), 'perfect');
  assert.equal(gradeOffset(-40), 'perfect');
  assert.equal(gradeOffset(150), 'great');
  assert.equal(gradeOffset(-250), 'ok');
  assert.equal(gradeOffset(400), 'miss');
});

test('a smart setlist beats a lazy one', () => {
  const smart = judgeSetlist([song('opener', 50, 140), song('ballad', 40, 80), song('deep', 30, 128), song('hit', 90, 124)]);
  const lazy = judgeSetlist([song('hit', 90, 124), song('ballad', 40, 80), song('slow2', 30, 76), song('opener', 50, 140)]);
  assert.ok(smart.bonus > lazy.bonus, `${smart.bonus} vs ${lazy.bonus}`);
  assert.ok(smart.notes.some((n) => n.includes('hit for last')));
  assert.ok(lazy.notes.some((n) => n.includes('back to back')));
});

test('every song has a drop cue and an effect cue', () => {
  for (const bpm of [80, 100, 140]) {
    const cues = cuesForSong(song('x', 50, bpm));
    assert.equal(cues[0].kind, 'drop');
    assert.notEqual(cues[1].kind, 'drop');
    assert.ok(cues[1].bar > cues[0].bar);
  }
});

test('scores stay in range and stars follow them', () => {
  const tally = { stats: BASE_STATS, burnout: 10, showBonus: 0, setBonus: 0, cuePoints: 0, energies: [50] };
  const mid = finalScore(tally);
  assert.ok(mid >= 5 && mid <= 100);
  assert.ok(finalScore({ ...tally, cuePoints: 80, energies: [95, 98] }) > mid);
  assert.equal(finalScore({ ...tally, cuePoints: -500 }), 5);
  assert.equal(starsFor(95), 5);
  assert.equal(starsFor(10), 1);
  assert.ok(showFans(10_000, 90) > showFans(10_000, 40));
  assert.equal(showFans(10_000, 20), 0);
});

test('stage moments: a stronger stat fails less', () => {
  const option = STAGE_MOMENTS[0].options[0];
  const strong = resolveStageOption(option, 100, () => 0.3);
  const weak = resolveStageOption(option, 0, () => 0.3);
  assert.equal(strong.worked, true);
  assert.equal(weak.worked, false);
  assert.ok(stageMomentsFor('any', 100).length > 0);
  assert.ok(stageMomentsFor('closer', 100_000).length > stageMomentsFor('closer', 10).length);
});
