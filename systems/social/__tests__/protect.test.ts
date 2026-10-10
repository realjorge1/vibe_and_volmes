import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../../../types/player';
import type { Moment } from '../../../types/drama';
import type { SocialPost } from '../../../types/social';
import { generateThread, type ThreadReply } from '../threadGenerator';
import { guardThread, hasNegative, isApproved, isProtected, SAFE_SIDES, shortLocation } from '../protect';
import { postBoost, realKey, isRealKey, feedAspect, fitSize } from '../realPhotos';
import { ALL_REAL_TEMPLATES } from '../../../data/social/realPhotoComments';
import { HATER, RIVAL_RAID, ADDRESS_IT, BANTER, THIRST_COMMENTS, CRAZY } from '../../../data/drama/comments';
import { makeMoment } from '../../drama/moments';

const RIVALS = ['Blaze Omen', 'Nova Starr', 'LX Remy', 'Prophet Zero', 'Kassia B', 'Yung Vector', 'Destine Rio', 'Cash Melo', 'Ember Fox', 'Luca Moreno'];

function makePlayer(fans: number, reputation: number, name = 'Test Artist'): Player {
  return {
    id: 'p1',
    artistName: name,
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
      creativity: 55, discipline: 50, reputation, fans,
      fanLoyalty: 60, industryRespect: 40, mentalHealth: 70, energy: 80,
    },
  };
}

function realPost(i: number, caption: string, location?: string): SocialPost {
  const key = realKey(1_700_000_000_000 + i, () => (i % 97) / 97);
  return {
    id: `my-flashpic-${1_700_000_000_000 + i}`,
    platform: (['flashpic', 'chirper', 'tunetok'] as const)[i % 3],
    account: { id: 'player', username: 'Test Artist', handle: 'testartist', accountType: 'fan', followers: 1000, isVerified: false, preferredPlatforms: ['flashpic'] },
    content: caption,
    sentiment: 'hype',
    likes: 0,
    reposts: 0,
    replies: 0,
    media: { kind: 'image', description: `📸 photo:${key}`, photoKeys: [key], real: true },
    location,
    week: 10,
  };
}

const worstMoments: Moment[] = [
  makeMoment({ kind: 'scandal', headline: 'H', topic: 'the leaked DMs', heat: 100, valence: -100 }, 9, {}, 'm1'),
  makeMoment({ kind: 'ugly', headline: 'H', topic: 'the meltdown', heat: 95, valence: -90 }, 9, {}, 'm2'),
];

const CAPTIONS = [
  '',
  'birthday weekend with the family',
  'gym then studio, new music soon',
  'throwback to when it all started #tbt',
  'my dog thinks he runs the house',
  'graduated!!! #grad',
  'date night with bae',
  'sunset in the city',
  'just vibes',
  'happy new year from us',
  'hater free zone lol',
  'they said I would flop',
];

const LOCATIONS = [undefined, 'Lagos, Nigeria', 'Mars, Milky Way', 'worst day ever', 'Studio B', 'a place where everyone is ugly', 'Paris'];

test('isProtected: real flag, real keys and photo:real descriptions all count', () => {
  const p = realPost(1, 'hi');
  assert.equal(isProtected(p), true);
  assert.equal(isProtected({ media: { kind: 'image', description: 'x', photoKeys: [p.media!.photoKeys![0]] } }), true);
  assert.equal(isProtected({ media: { kind: 'image', description: `📸 photo:${p.media!.photoKeys![0]}` } }), true);
  assert.equal(isProtected({ media: { kind: 'image', description: '📸 photo:ab12cd34ef' } }), false);
  assert.equal(isProtected({ media: undefined }), false);
  assert.equal(isRealKey(realKey(Date.now())), true);
  assert.equal(isRealKey('ab12cd34ef'), false);
});

test('the vetted pool itself is clean (no line trips the negative filter)', () => {
  for (const t of ALL_REAL_TEMPLATES) {
    const filled = t
      .replace(/\{loc\}/g, 'Lagos')
      .replace(/\{name\}/g, 'Test Artist')
      .replace(/\{thing\}/g, 'dog')
      .replace(/\{friend\}/g, 'kemi.o')
      .replace(/\{n\}/g, '3');
    assert.equal(hasNegative(filled), false, `vetted line trips the filter: ${t}`);
    assert.equal(isApproved(filled), true, `vetted line not approved: ${t}`);
  }
});

test('the negative filter has no false alarms on kind words', () => {
  for (const ok of ['this made my day', 'golden hour perfection', 'the outfit is everything', 'so proud of you', 'killer view'.replace('killer', 'what a')]) {
    assert.equal(hasNegative(ok), false, ok);
  }
  for (const bad of ['this flopped', 'you look old', 'L', 'mid 💀', 'who asked', 'ratio', 'so fake', 'haters gonna hate', 'address the scandal']) {
    assert.equal(hasNegative(bad), true, bad);
  }
});

test('NOTHING negative under a real photo, in the worst game states', () => {
  let total = 0;
  for (let i = 0; i < 1500; i++) {
    const fans = [0, 40, 900, 12_000, 250_000, 3_000_000, 40_000_000][i % 7];
    const reputation = [0, 3, 9, 20, 50, 95][i % 6]; // cancelled through icon
    const player = makePlayer(fans, reputation, i % 11 === 0 ? 'Lil Trash' : 'Test Artist');
    const post = realPost(i, CAPTIONS[i % CAPTIONS.length], LOCATIONS[i % LOCATIONS.length]);
    const thread = generateThread(post, player, {
      moments: worstMoments,
      rivalName: RIVALS[i % RIVALS.length],
      partnerName: 'Kayla',
      rivalNames: RIVALS,
      // A rival slipped into the friends list must still never comment.
      friends: [
        { id: 'lx-remy', name: 'LX Remy', handle: 'lxremy' },
        { id: 'destine-rio', name: 'Destine Rio', handle: 'destinerio' },
        { id: 'blaze-omen', name: RIVALS[i % RIVALS.length], handle: 'rival' },
      ],
    });
    assert.ok(thread.length >= 1, 'a real photo still gets kind comments');
    for (const r of thread) {
      total++;
      assert.ok(SAFE_SIDES.has(r.side), `unsafe side ${r.side}`);
      assert.equal(hasNegative(r.content), false, `negative comment: ${r.content}`);
      assert.equal(isApproved(r.content), true, `unvetted comment: ${r.content}`);
      for (const n of RIVALS) assert.ok(!r.content.includes(n), `rival named: ${r.content}`);
      assert.ok(!/(^|\s)Lil Trash/.test(r.content), 'an artist name that reads as an insult is dropped');
    }
  }
  assert.ok(total > 3000, `enough comments were checked (${total})`);
});

test('the guard catches a bad comment even if a future bug puts one under a real photo', () => {
  const post = realPost(7, 'hi');
  const mk = (side: ThreadReply['side'], content: string): ThreadReply => ({
    id: `x-${content}`, side, username: 'someone', handle: 'someone', verified: false, content, likes: 9, accountId: 'c-w-someone',
  });
  const poisoned: ThreadReply[] = [
    ...HATER.map((c) => mk('hater', c)),
    ...RIVAL_RAID.map((c) => mk('rival', c)),
    ...ADDRESS_IT.map((c) => mk('fan', c)),
    ...BANTER.map((c) => mk('fan', c)),
    ...CRAZY.map((c) => mk('stan', c)),
    ...Object.values(THIRST_COMMENTS).flat().map((c) => mk('fan', c)),
    mk('fan', 'this is mid'),
    mk('fan', 'obsessed with this'),
  ];
  const kept = guardThread(post, poisoned, { rivalNames: RIVALS });
  assert.deepEqual(kept.map((r) => r.content), ['obsessed with this']);
});

test('the guard leaves everything else alone', () => {
  const post = { ...realPost(3, 'hi'), media: { kind: 'image' as const, description: '📸 photo:ab12cd34ef' } };
  const replies: ThreadReply[] = [{ id: 'a', side: 'hater', username: 'x', handle: 'x', verified: false, content: 'flop', likes: 1, accountId: 'x' }];
  assert.deepEqual(guardThread(post, replies), replies);
});

test('real-photo threads are stable and grow with fame', () => {
  const post = realPost(11, 'birthday dinner', 'Lagos, Nigeria');
  const a = generateThread(post, makePlayer(1000, 50));
  const b = generateThread(post, makePlayer(1000, 50));
  assert.deepEqual(a, b);
  const avg = (fans: number) => {
    let n = 0;
    for (let i = 0; i < 200; i++) n += generateThread(realPost(i, 'hi'), makePlayer(fans, 50)).length;
    return n / 200;
  };
  assert.ok(avg(5_000_000) > avg(50) + 3, 'stars get more comments than unknowns');
});

test('caption and location shape the comments', () => {
  let birthday = 0;
  let lagos = 0;
  for (let i = 0; i < 300; i++) {
    const t = generateThread(realPost(i, 'my birthday!!', 'Lagos, Nigeria'), makePlayer(500_000, 50));
    if (t.some((r) => /birthday|HBD/i.test(r.content))) birthday++;
    if (t.some((r) => r.content.includes('Lagos'))) lagos++;
  }
  assert.ok(birthday > 200, `birthday lines show up (${birthday})`);
  assert.ok(lagos > 100, `location lines show up (${lagos})`);
  assert.equal(shortLocation('a very long location that nobody would ever type in full'), null);
  assert.equal(shortLocation('Paris, France'), 'Paris');
});

test('posting helps a little, less with each post in a day, never hurts', () => {
  const now = 10 * 86_400_000;
  const first = postBoost(10_000, [], now);
  const second = postBoost(10_000, [now - 1000], now);
  const third = postBoost(10_000, [now - 1000, now - 2000], now);
  const fourth = postBoost(10_000, [now - 1000, now - 2000, now - 3000], now);
  assert.ok(first.fans > second.fans && second.fans > third.fans);
  assert.equal(fourth.fans, 0);
  assert.equal(first.mental, 1);
  assert.equal(second.mental, 0);
  assert.ok(postBoost(0, [], now).fans >= 1);
  assert.ok(postBoost(10_000_000, [], now).fans < 20_000, 'a star gets a small bump, not a flood');
  assert.ok(postBoost(10_000, [now - 2 * 86_400_000], now).weight === 1, 'yesterday does not count');
  for (const f of [0, 10, 1e3, 1e6, 1e8]) assert.ok(postBoost(f, [], now).fans >= 0);
});

test('feed sizing keeps Instagram proportions', () => {
  assert.equal(feedAspect(1000, 3000), 0.8);
  assert.equal(feedAspect(4000, 1000), 1.91);
  assert.equal(feedAspect(1200, 1200), 1);
  assert.equal(fitSize(800, 600), null);
  assert.deepEqual(fitSize(4000, 3000), { width: 1080 });
  assert.deepEqual(fitSize(3000, 4000), { height: 1080 });
});
