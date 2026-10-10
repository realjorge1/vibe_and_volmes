import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../../../types/player';
import type { Track } from '../../../types/music';
import { playerAccount, playerHandle } from '../playerAccount';

function makePlayer(fans: number): Player {
  return {
    id: 'p1',
    artistName: 'Lil Test-Artist',
    realName: 'Test',
    gender: 'female',
    genre: 'pop',
    city: 'Atlanta',
    archetype: 'indie-dreamer',
    money: 0,
    week: 10,
    createdAt: 0,
    startAge: 21,
    stats: {
      talent: 60, writing: 55, vocalSkill: 60, charisma: 65, authenticity: 55,
      creativity: 55, discipline: 50, reputation: 55, fans,
      fanLoyalty: 60, industryRespect: 40, mentalHealth: 70, energy: 80,
    },
  };
}

function makeTrack(id: string, over: Partial<Track> = {}): Track {
  return {
    id,
    title: `Song ${id}`,
    type: 'single',
    genre: 'pop',
    releasedAtWeek: 4,
    quality: 70,
    replayValue: 60,
    originality: 60,
    mainstreamAppeal: 60,
    peakChartPosition: null,
    peakFans: 0,
    weeklyStreams: 0,
    totalStreams: 100_000,
    status: 'charting',
    wentViral: false,
    ...over,
  };
}

test('playerHandle: a lowercase slug of the artist name', () => {
  assert.equal(playerHandle(makePlayer(0)), 'liltestartist');
});

test('playerAccount: deterministic, so a profile never reshuffles', () => {
  const player = makePlayer(80_000);
  const tracks = [makeTrack('b'), makeTrack('a')];
  const a = playerAccount(player, 'tunetok', tracks);
  const b = playerAccount(player, 'tunetok', tracks);
  assert.deepEqual(a, b);
});

test('playerAccount: followers grow with the fanbase on every app', () => {
  for (const platform of ['chirper', 'flashpic', 'tunetok'] as const) {
    const small = playerAccount(makePlayer(1_000), platform, []).account.followers;
    const big = playerAccount(makePlayer(1_000_000), platform, []).account.followers;
    assert.ok(big > small * 50, `${platform}: ${big} vs ${small}`);
    assert.ok(small > 0, 'even an unknown has friends and family following');
  }
});

test('playerAccount: one post per release, newest first, and a hit out-performs a flop', () => {
  const tracks = [
    makeTrack('hit', { quality: 95, wentViral: true, totalStreams: 5_000_000 }),
    makeTrack('flop', { quality: 20, totalStreams: 1_000 }),
  ];
  const acct = playerAccount(makePlayer(200_000), 'flashpic', tracks);
  assert.equal(acct.posts.length, 2);
  assert.equal(acct.posts[0].id, 'me-flashpic-hit');
  assert.ok(acct.posts[0].likes > acct.posts[1].likes * 3);
  assert.equal(acct.likes, acct.posts[0].likes + acct.posts[1].likes);
  assert.ok(acct.account.isVerified);
  assert.equal(acct.posts[0].media?.kind, 'image');
});
