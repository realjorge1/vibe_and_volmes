import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALENDAR, agoPhrase, careerYear, isHolidaySeason, isNewYearWeek, weeksUntil, yearWeek } from '../calendar';
import { nominate, rollWinners, playerScore, type AwardContext, type NpcCandidate } from '../awardsEngine';
import { buildLineup, slotFee } from '../festivalEngine';
import { buildWrapped, rankLine } from '../wrapped';
import { buildBoard, chartDayBeat, BOARD_SIZE } from '../../charts/chartBoard';
import type { Track } from '../../../types/music';

function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

test('the year is 12 weeks with fixed tentpoles', () => {
  assert.equal(yearWeek(1), 1);
  assert.equal(yearWeek(12), 12);
  assert.equal(yearWeek(13), 1);
  assert.equal(careerYear(12), 1);
  assert.equal(careerYear(13), 2);
  assert.equal(isNewYearWeek(1), false);
  assert.equal(isNewYearWeek(13), true);
  assert.equal(isHolidaySeason(10), true);
  assert.equal(isHolidaySeason(9), false);
  assert.equal(weeksUntil(5, CALENDAR.awards), 4);
  assert.equal(weeksUntil(10, CALENDAR.lineup), 5);
  assert.ok(CALENDAR.lineup < CALENDAR.festival && CALENDAR.nominations < CALENDAR.awards);
  assert.equal(agoPhrase(30), 'two years ago');
});

const NPCS: NpcCandidate[] = Array.from({ length: 30 }, (_, i) => ({
  npcId: `n${i}`,
  name: `Artist ${i}`,
  genre: i % 2 ? 'pop' : 'hip-hop',
  followers: 10_000 * (i + 1) * (i + 1),
  talent: 40 + i,
  marketability: 50,
  influence: 50,
  momentum: 10,
  stage: i < 5 ? 'rising' : i < 20 ? 'established' : 'star',
  work: `Song ${i}`,
}));

function ctx(over: Partial<AwardContext> = {}): AwardContext {
  return {
    playerName: 'Nova Kay',
    careerYear: 2,
    genreLabel: 'Pop',
    fans: 5_000,
    reputation: 50,
    industryRespect: 30,
    charisma: 50,
    vocalSkill: 50,
    songs: [{ title: 'Paper Hearts', critics: 60, peak: 40, viral: false }],
    bestShow: 0,
    showsThisYear: 0,
    hadBestNew: false,
    ...over,
  };
}

test('five nominees a category; a small artist misses, a huge one gets in', () => {
  const small = nominate(ctx(), NPCS, 'pop', seq(0.5));
  for (const n of small) assert.ok(n.nominees.length <= 5 && n.nominees.length > 0, n.label);
  assert.ok(!small.find((n) => n.category === 'artist-of-the-year')!.nominees.some((x) => x.isPlayer));

  const star = nominate(
    ctx({ fans: 40_000_000, reputation: 90, industryRespect: 95, songs: [{ title: 'Supernova', critics: 95, peak: 1, viral: true }] }),
    NPCS,
    'pop',
    seq(0.5)
  );
  assert.ok(star.find((n) => n.category === 'artist-of-the-year')!.nominees.some((x) => x.isPlayer));
  assert.ok(star.find((n) => n.category === 'song-of-the-year')!.nominees.some((x) => x.isPlayer && x.work === 'Supernova'));
  assert.equal(playerScore('live-act', ctx()), null, 'no shows, no live award');
  assert.equal(playerScore('best-new-artist', ctx({ careerYear: 4 })), null, 'only new once');
});

test('winners: one per category, and a big edge wins it', () => {
  const noms = nominate(
    ctx({ fans: 40_000_000, reputation: 90, industryRespect: 95, songs: [{ title: 'Supernova', critics: 95, peak: 1, viral: true }] }),
    NPCS,
    'pop',
    seq(0.5)
  );
  const results = rollWinners(noms, 200, seq(0.5));
  assert.equal(results.length, noms.length);
  for (const r of results) if (r.playerNominated) assert.equal(r.playerWon, true);
});

test('the poster: a bigger name gets a bigger slot and a bigger fee', () => {
  const world = NPCS.map((n) => ({ name: n.name, followers: n.followers }));
  const nobody = buildLineup(world, { name: 'Nova Kay', followers: 500 }, seq(0.5));
  assert.equal(nobody.slot, null);
  const small = buildLineup(world, { name: 'Nova Kay', followers: 5_000 }, seq(0.5));
  assert.equal(small.slot, 'undercard');
  assert.ok(small.tiers[3].includes('Nova Kay'));
  const huge = buildLineup(world, { name: 'Nova Kay', followers: 50_000_000 }, seq(0.5));
  assert.equal(huge.slot, 'headliner');
  assert.ok(huge.tiers[0].includes('Nova Kay'));
  assert.ok(slotFee('headliner', 1_000_000) > slotFee('undercard', 1_000_000));
});

function track(id: string, total: number, released: number, peak: number | null): Track {
  return {
    id,
    title: id,
    type: 'single',
    genre: 'pop',
    releasedAtWeek: released,
    quality: 60,
    replayValue: 60,
    originality: 60,
    mainstreamAppeal: 60,
    peakChartPosition: peak,
    peakFans: 0,
    weeklyStreams: 0,
    totalStreams: total,
    status: 'charting',
    wentViral: false,
  };
}

test('wrapped counts only this year', () => {
  const card = buildWrapped({
    start: { year: 1, week: 1, fans: 100, lifetimeEarnings: 0, trackStreams: { old: 1_000 }, releases: 1 },
    age: 22,
    fans: 2_100,
    lifetimeEarnings: 9_000,
    tracks: [track('old', 3_000, 0, 50), track('new', 10_000, 5, 12)],
    showScores: [70, 88],
    awardsWon: 0,
    nominations: 1,
    biggestMoment: null,
    rank: { position: 40, of: 200 },
    newPeople: ['Dre'],
    wantsMet: 3,
  });
  assert.equal(card.streams, 12_000);
  assert.equal(card.topSong?.title, 'new');
  assert.equal(card.fansGained, 2_000);
  assert.equal(card.releases, 1);
  assert.equal(card.bestPeak, 12);
  assert.equal(card.bestShow, 88);
  assert.match(rankLine(1, 100), /biggest/);
});

test('the chart board: your songs at their positions, the world around them', () => {
  const releases = Array.from({ length: 10 }, (_, i) => ({ npcId: `n${i}`, artist: `Artist ${i}`, followers: 100_000 * (i + 1), momentum: 10, title: `Song ${i}` }));
  // The real world has 120 artists; filler comes from the biggest 80.
  const filler = Array.from({ length: 80 }, (_, i) => ({ npcId: `f${i}`, artist: `Filler ${i}`, followers: 20_000 * (i + 1), momentum: 0, title: `Catalog ${i}` }));
  const first = buildBoard({
    week: 5,
    prev: null,
    pool: [],
    playerName: 'Nova Kay',
    playerEntries: [{ trackId: 't1', title: 'Paper Hearts', position: 7, streams: 50_000, peak: 7, weeksOn: 1 }],
    releases,
    filler,
    rival: { id: 'r1', name: 'Kairo', fans: 2_000_000, title: 'Cold' },
    rng: seq(0.4, 0.6),
  });
  assert.equal(first.board.rows.length, BOARD_SIZE);
  assert.equal(first.board.rows[6].trackId, 't1');
  assert.equal(first.board.rows[6].isPlayer, true);
  assert.ok(first.board.rows.some((r) => r.isRival), 'the rival has a song out');
  assert.deepEqual(first.board.rows.map((r) => r.pos), Array.from({ length: BOARD_SIZE }, (_, i) => i + 1));

  const second = buildBoard({
    week: 6,
    prev: first.board,
    pool: first.pool,
    playerName: 'Nova Kay',
    playerEntries: [{ trackId: 't1', title: 'Paper Hearts', position: 3, streams: 80_000, peak: 3, weeksOn: 2 }],
    releases: [],
    filler,
    rival: null,
    rng: seq(0.5),
  });
  const mine = second.board.rows.find((r) => r.trackId === 't1')!;
  assert.equal(mine.lastPos, 7);
  assert.equal(mine.pos, 3);
});

test('chart day: the loudest thing that happened', () => {
  assert.equal(chartDayBeat([{ trackId: 'a', position: 1 }], new Map([['a', 4]])), 'number-one');
  assert.equal(chartDayBeat([{ trackId: 'a', position: 9 }], new Map([['a', 15]])), 'top-10');
  assert.equal(chartDayBeat([{ trackId: 'a', position: 30 }], new Map()), 'debut');
  assert.equal(chartDayBeat([{ trackId: 'a', position: 20 }], new Map([['a', 21]])), null, 'steady weeks pass quietly');
});
