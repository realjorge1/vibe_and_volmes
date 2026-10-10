import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../../../types/player';
import type { SocialPost } from '../../../types/social';
import { feedMix, laneCounts, splitCount, interleave } from '../lanes';
import { everydayPosts, everydayThread, everydayTrends, everydayTimeline, newsArticle } from '../everyday';
import { beatsFor, fillWorld, worldMoment, monthOf } from '../worldCalendar';
import { CALENDAR_BEATS } from '../../../data/social/everyday/calendar';
import { VIBES } from '../../../data/social/everyday/vibes';
import { REGULARS } from '../../../data/social/everyday/accounts';
import { HEADLINES } from '../../../data/social/everyday/news';
import { buildCast, celebEvents, celebPosts, celebThread, celebTimeline, celebTrends, linkNamed, genderOfName, type NamedInfo } from '../celebFeed';
import { generateThread } from '../threadGenerator';
import { generateWorld, simulateWeeks } from '../../world';
import { seeded } from '../../drama/crowd';

function makePlayer(fans: number): Player {
  return {
    id: 'p1', artistName: 'Test Artist', realName: 'Test', gender: 'female', genre: 'pop', city: 'Atlanta',
    archetype: 'indie-dreamer', money: 0, week: 10, createdAt: Date.UTC(2026, 0, 1), startAge: 21,
    stats: { talent: 60, writing: 55, vocalSkill: 60, charisma: 65, authenticity: 55, creativity: 55, discipline: 50, reputation: 50, fans, fanLoyalty: 60, industryRespect: 40, mentalHealth: 70, energy: 80 },
  };
}

const LEFTOVER = /\{[a-zA-Z]+\}/;

test('feed mix: an unknown scrolls the world, a star sees more of themselves', () => {
  const unknown = feedMix(0);
  const star = feedMix(20_000_000);
  for (const m of [unknown, star, feedMix(50_000)]) assert.ok(Math.abs(m.everyday + m.celeb + m.you - 1) < 1e-9);
  assert.ok(unknown.everyday > 0.6 && unknown.you < 0.25, `unknown: ${JSON.stringify(unknown)}`);
  assert.ok(star.you > 0.35 && star.everyday <= 0.36, `star: ${JSON.stringify(star)}`);
  assert.ok(star.celeb > unknown.celeb);
  for (const total of [0, 1, 7, 12, 40]) {
    const s = splitCount(total, feedMix(3_000));
    assert.equal(s.everyday + s.celeb + s.you, total);
  }
  const l = laneCounts(12, 0);
  assert.ok(l.everyday > l.celeb && l.everyday + l.celeb <= 48);
  assert.deepEqual(interleave([1, 2, 3], [9], () => 0), [9, 1, 2, 3]);
});

test('the world calendar: finals in June, Halloween in October, a new phone every September', () => {
  const ids = (w: number) => beatsFor(w).map((b) => b.id);
  assert.ok(ids(6).includes('pbl-finals'));
  assert.ok(ids(10).includes('halloween'));
  assert.ok(ids(12).includes('holidays'));
  assert.ok(ids(18).includes('pbl-finals'), 'year two too');
  assert.equal(monthOf(13), 0);
  const y1 = worldMoment(9, 2026);
  const y2 = worldMoment(21, 2026);
  assert.notEqual(y1.phone, y2.phone);
  assert.notEqual(y1.finalists.pbl[0], y1.finalists.pbl[1]);
  assert.equal(worldMoment(5, 2026).classYear, 2026);
});

test('no line anywhere is left with an unfilled placeholder', () => {
  for (let week = 1; week <= 24; week++) {
    const m = worldMoment(week, 2026);
    const fillAll = (s: string) => fillWorld(s, m, { city: 'Atlanta', friend: 'someone' });
    for (const b of CALENDAR_BEATS) {
      for (const line of [b.hashtag, ...b.chirp, ...b.gram, ...b.tok, ...(b.news?.lines ?? []), ...(b.comments ?? [])]) {
        assert.ok(!LEFTOVER.test(fillAll(line)), `${b.id}: ${line}`);
      }
    }
    for (const [vibe, v] of Object.entries(VIBES)) {
      for (const line of [...v.chirp, ...v.gram, ...v.tok, ...v.comments]) assert.ok(!LEFTOVER.test(fillAll(line)), `${vibe}: ${line}`);
    }
    for (const lines of Object.values(HEADLINES)) for (const line of lines) assert.ok(!LEFTOVER.test(fillAll(line)), line);
  }
});

test('everyday posts: not about the player, right format per app, ads only from brands', () => {
  const rnd = seeded('ev-test');
  const posts = everydayPosts({ week: 6, baseYear: 2026, city: 'Atlanta', count: 400, idPrefix: 't', rnd });
  assert.equal(posts.length, 400);
  const ids = new Set<string>();
  for (const p of posts) {
    assert.equal(p.lane, 'everyday');
    assert.ok(!p.content.includes('Test Artist'));
    assert.ok(!LEFTOVER.test(p.content), p.content);
    assert.ok(!ids.has(p.id), 'unique ids');
    ids.add(p.id);
    if (p.platform === 'flashpic' || p.platform === 'tunetok') assert.ok(p.media, 'photo and video apps always carry media');
    if (p.platform === 'vibestream') assert.ok(p.vibe?.startsWith('news-') && p.sentiment === 'news');
    if (p.sponsored) assert.ok(p.account.id.startsWith('ad-'));
    if (p.account.id.startsWith('ad-')) assert.ok(p.sponsored);
  }
  assert.ok(posts.some((p) => p.beat === 'pbl-finals'), 'finals week shows up in June');
  assert.ok(posts.some((p) => p.sponsored), 'some ads');
  const locked = everydayPosts({ week: 3, baseYear: 2026, city: 'Atlanta', count: 30, idPrefix: 'l', platform: 'tunetok', rnd });
  assert.ok(locked.every((p) => p.platform === 'tunetok'));
  const a = everydayPosts({ week: 3, baseYear: 2026, city: 'Atlanta', count: 10, idPrefix: 'x', rnd: seeded('same') });
  const b = everydayPosts({ week: 3, baseYear: 2026, city: 'Atlanta', count: 10, idPrefix: 'x', rnd: seeded('same') });
  assert.deepEqual(a, b, 'seeded = repeatable');
});

test('everyday comments and profiles', () => {
  const player = makePlayer(500);
  const posts = everydayPosts({ week: 10, baseYear: 2026, city: 'Atlanta', count: 60, idPrefix: 'c', rnd: seeded('cm') });
  for (const p of posts) {
    const t = generateThread(p, player);
    assert.ok(t.length <= Math.max(0, p.replies));
    for (const r of t) assert.ok(!LEFTOVER.test(r.content), r.content);
    assert.deepEqual(t, everydayThread(p, { city: 'Atlanta', baseYear: 2026 }));
  }
  const tasha = REGULARS.find((a) => a.id === 'ev-eatwithtasha')!;
  const tl = everydayTimeline(tasha, 'flashpic', { week: 8, baseYear: 2026, city: 'Atlanta' }, 9);
  assert.equal(tl.length, 9);
  assert.ok(tl.every((p) => p.account.id === tasha.id && p.vibe === 'food'));
  const ledger = REGULARS.find((a) => a.id === 'ev-ledger')!;
  const news = everydayTimeline(ledger, 'vibestream', { week: 8, baseYear: 2026, city: 'Atlanta' }, 6);
  assert.ok(news.every((p) => p.vibe === 'news-world' || p.vibe === 'news-business'));
  assert.ok(newsArticle(news[0])!.length >= 3);
});

test('world trends never count as the player’s trends', () => {
  const t = everydayTrends(6, 2026, seeded('tr'));
  assert.ok(t.length >= 3);
  assert.ok(t.every((x) => x.world));
  assert.ok(t.some((x) => x.hashtag === '#PBLFinals'));
});

// --- Other artists ---------------------------------------------------------------

const NAMED: NamedInfo[] = [
  { id: 'blaze-omen', name: 'Blaze Omen', genre: 'hip-hop', fans: 850_000, gender: 'man', relation: 'rival' },
  { id: 'nova-starr', name: 'Nova Starr', genre: 'pop', fans: 4_200_000, gender: 'woman', relation: 'neutral' },
  { id: 'lx-remy', name: 'LX Remy', genre: 'r&b', fans: 1_500_000, gender: 'man', relation: 'friend' },
];

function world() {
  return simulateWeeks(generateWorld(4242), 30);
}

test('named artists are linked to distinct world artists, and keep their links', () => {
  const w = world();
  const links = linkNamed(NAMED, w);
  const ids = Object.values(links);
  assert.equal(ids.length, NAMED.length);
  assert.equal(new Set(ids).size, ids.length, 'one world artist each');
  for (const id of ids) assert.equal(w.npcs[id].role, 'artist');
  assert.deepEqual(linkNamed(NAMED, w, links), links, 'stable');
});

test('the cast and their stories use the named artists’ names', () => {
  const w = world();
  const links = linkNamed(NAMED, w);
  const cast = buildCast(NAMED, w, links, { max: 20 });
  assert.ok(cast.length >= NAMED.length + 10);
  assert.ok(cast.filter((m) => m.named).every((m) => m.accountId.startsWith('artist-')));
  assert.ok(cast.filter((m) => !m.named).every((m) => /^npc-[wm]-/.test(m.accountId)));
  const events = celebEvents(w, cast, 30);
  assert.ok(events.length > 0, 'the world had stories');
  for (const e of events) {
    if (!e.subject.named) continue;
    const npcName = w.npcs[e.subject.npcId!].name;
    assert.ok(!e.headline.includes(npcName) || npcName === e.subject.name, `alias leaked: ${e.headline}`);
    assert.ok(!['retirement', 'debut', 'deal-dropped'].includes(e.type));
  }
});

test('celebrity posts: about another artist, with lovers and haters (and your fans under your rival)', () => {
  const w = world();
  const links = linkNamed(NAMED, w);
  const cast = buildCast(NAMED, w, links, { max: 20 });
  const input = { week: 12, playerName: 'Test Artist', city: 'Atlanta', cast, events: celebEvents(w, cast, 30) };
  const posts = celebPosts(input, { count: 300, idPrefix: 'cl', rnd: seeded('cl') });
  assert.equal(posts.length, 300);
  for (const p of posts) {
    assert.equal(p.lane, 'celeb');
    assert.ok(p.subject && p.subject.name.length > 0);
    assert.ok(!LEFTOVER.test(p.content), p.content);
  }
  const player = makePlayer(80_000);
  let hate = 0;
  let love = 0;
  let yours = 0;
  for (const p of posts) {
    const t = generateThread(p, player, { cast });
    for (const r of t) {
      assert.ok(!LEFTOVER.test(r.content), r.content);
      if (r.side === 'hater') hate++;
      if (r.side === 'fan') love++;
      if (r.content.includes('Test Artist')) yours++;
    }
  }
  assert.ok(hate > 0 && love > 0, 'lovers and haters');
  assert.ok(yours > 0, 'the player’s rivalry shows up in a rival’s comments');
  const blaze = cast.find((m) => m.id === 'blaze-omen')!;
  const tl = celebTimeline(blaze, 'flashpic', input, 9);
  assert.equal(tl.length, 9);
  assert.ok(tl.every((p) => p.account.id === 'artist-blaze-omen'));
  assert.ok(celebTrends(input).every((t) => t.world));
});

test('a rival thread drags the player only on the rival’s post, never under a real photo', () => {
  const w = world();
  const cast = buildCast(NAMED, w, linkNamed(NAMED, w), { max: 5 });
  const post: SocialPost = {
    id: 'cl-x', platform: 'chirper', account: { id: 'artist-blaze-omen', username: 'Blaze Omen', handle: 'blazeomen', accountType: 'artist', followers: 500_000, isVerified: true, preferredPlatforms: ['chirper'] },
    content: 'studio till sunrise again', sentiment: 'positive', likes: 9000, reposts: 10, replies: 400, week: 3, lane: 'celeb', subject: { id: 'blaze-omen', name: 'Blaze Omen', handle: 'blazeomen' },
  };
  const t = celebThread(post, { playerName: 'Test Artist', cast });
  assert.ok(t.length > 0);
  // A celebrity-lane label on a real photo would still be guarded: protection is checked first.
  const sneaky: SocialPost = { ...post, id: 'my-flashpic-1', media: { kind: 'image', description: 'x', real: true, photoKeys: ['realabc123xyz'] } };
  const safe = generateThread(sneaky, makePlayer(1000), { cast, rivalNames: ['Blaze Omen'] });
  assert.ok(safe.every((r) => r.side === 'fan' || r.side === 'stan' || r.side === 'friend'));
  assert.ok(safe.every((r) => !r.content.includes('Blaze Omen')));
});

test('world artists get genders from their names when they say', () => {
  assert.equal(genderOfName('Queen Nova', 'x'), 'woman');
  assert.equal(genderOfName('King Cash', 'x'), 'man');
  assert.equal(genderOfName('Lil Echo', 'a'), genderOfName('Lil Echo', 'a'));
});
