import { resetFakeDb } from '../../__testing__/nativeMocks';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { NpcAccount, Platform, SocialPost } from '../../../types/social';
import { usePlayerStore } from '../../../store/playerStore';
import { useGameStore } from '../../../store/gameStore';
import { useSocialStore } from '../../../store/socialStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { initializeFirstWeek, runWeekTransition } from '../../weekEngine';
import { retireCareer } from '../../legacy/retirement';
import { generateThread } from '../../social/threadGenerator';
import { findPost } from '../../social/postLookup';
import { createAuthored, withEngagement } from '../../social/authored';
import {
  commentDraft,
  followDraft,
  likeDraft,
  mentionDraft,
  storyDraft,
  summaryLine,
  type Me,
} from '../compose';
import { feedHighlights } from '../select';
import { deliver } from '../deliver';
import { clearSchedule, pendingCount } from '../schedule';
import { handleNotificationLink, parseNotificationLink } from '../open';

const ME: Me = { handle: 'novakay', name: 'Nova Kay', trackTitle: 'Glass Heart' };

function account(over: Partial<NpcAccount> = {}): NpcAccount {
  return {
    id: 'fan-1',
    username: 'Jordan K',
    handle: 'jordankmusic',
    accountType: 'fan',
    followers: 340,
    isVerified: false,
    preferredPlatforms: ['chirper', 'flashpic'],
    ...over,
  };
}

function post(platform: Platform, over: Partial<SocialPost> = {}): SocialPost {
  return {
    id: `p-${platform}-${Math.random().toString(36).slice(2, 8)}`,
    platform,
    account: account(),
    content: 'Nova Kay is NOT playing around with this one 🔥',
    sentiment: 'hype',
    likes: 1200,
    reposts: 30,
    replies: 80,
    views: 40_000,
    week: 3,
    ...over,
  };
}

function start(): void {
  resetFakeDb();
  clearSchedule();
  if (usePlayerStore.getState().player) retireCareer();
  useNotificationStore.getState().reset();
  usePlayerStore.getState().createPlayer({
    artistName: 'Nova Kay',
    realName: 'Nova Kay',
    gender: 'female',
    genre: 'pop',
    city: 'atlanta',
    archetype: 'indie-dreamer',
    startAge: 22,
  });
  useGameStore.getState().startGame();
  initializeFirstWeek();
}

beforeEach(() => {
  useNotificationStore.getState().reset();
  clearSchedule();
});

// --- Copy ----------------------------------------------------------------------

test('each app words a mention its own way, and the tap opens that post', () => {
  const chirp = mentionDraft(post('chirper'), ME);
  assert.equal(chirp.kind, 'mention');
  assert.equal(chirp.title, 'Jordan K');
  assert.match(chirp.body, /NOT playing around/);

  const gram = mentionDraft(post('flashpic', { media: { kind: 'image', description: '📸 crowd at the show' } }), ME);
  assert.equal(gram.title, 'novakay', 'VibeGram puts your handle on top');
  assert.equal(gram.body, 'jordankmusic shared a post about you.');
  assert.ok(gram.image?.photoKey, 'with the post’s picture');

  const tok = mentionDraft(post('tunetok'), ME);
  assert.match(tok.body, /^mentioned you in a video: /);

  const news = mentionDraft(post('vibestream', { sentiment: 'news', content: 'Charts update: Nova Kay makes a move this week' }), ME);
  assert.equal(news.kind, 'news');
  assert.equal(news.title, 'Charts update: Nova Kay makes a move this week');
  for (const d of [chirp, gram, tok, news]) assert.equal(d.target.kind, 'post');
});

test('likes, comments and follows read like the real pushes', () => {
  const mine = post('flashpic', { id: 'me-flashpic-t1', account: account({ id: 'player', username: 'Nova Kay', handle: 'novakay' }) });
  const actor = { id: 'fan-2', name: 'Bri P', handle: 'bripdaily', verified: false };
  assert.equal(likeDraft('flashpic', mine, actor, ME).body, 'bripdaily liked your post.');
  assert.equal(likeDraft('flashpic', mine, actor, ME, 2300).body, 'bripdaily and 2.3K others liked your post.');
  assert.equal(likeDraft('tunetok', mine, actor, ME).body, 'liked your video.');
  assert.equal(followDraft('flashpic', actor, ME).body, 'bripdaily started following you.');
  assert.deepEqual(followDraft('chirper', actor, ME).target, { kind: 'account', accountId: 'fan-2' });

  const reply = { id: 'rep-x-0', side: 'fan' as const, username: 'Kai', handle: 'kai.wav', verified: false, content: 'on repeat since midnight', likes: 3, accountId: 'r-kai.wav' };
  const c = commentDraft('tunetok', mine, reply, ME);
  assert.equal(c.body, 'commented: on repeat since midnight');
  assert.deepEqual(c.target, { kind: 'comments', postId: mine.id, replyId: 'rep-x-0' });
  assert.equal(commentDraft('flashpic', mine, reply, ME).body, 'kai.wav commented: on repeat since midnight');
});

test('a story mention carries the story itself, so the tap can show it', () => {
  const story = post('flashpic', { content: 'seeing @novakay live was insane 😭', media: { kind: 'image', description: '📸 crowd at the show' } });
  const d = storyDraft(story, ME);
  assert.deepEqual(d.target, { kind: 'story', accountId: 'fan-1' });
  assert.equal(d.post?.id, story.id);
  assert.equal(d.body, 'jordankmusic mentioned you in their story.');
});

test('feedHighlights: one ping per app, the news app only for news', () => {
  const posts = [
    post('chirper', { account: account({ accountType: 'public', followers: 90 }) }),
    post('chirper', { account: account({ id: 'news-1', accountType: 'news', isVerified: true, followers: 2_300_000 }), sentiment: 'news' }),
    post('flashpic'),
    post('vibestream', { sentiment: 'hype' }),
  ];
  const picks = feedHighlights(posts, 3);
  assert.equal(picks.length, 2);
  assert.equal(picks[0].account.id, 'news-1', 'the verified outlet wins');
  assert.ok(!picks.some((p) => p.platform === 'vibestream'), 'no non-news on VibeNews');
  assert.equal(new Set(picks.map((p) => p.platform)).size, picks.length);
});

// --- Delivery ------------------------------------------------------------------

test('without the native module, a notification shows as the in-app banner and is kept', async () => {
  const n = await deliver(mentionDraft(post('chirper'), ME));
  assert.ok(n);
  const s = useNotificationStore.getState();
  assert.equal(s.items[0].id, n!.id);
  assert.equal(s.banner?.id, n!.id);
  assert.equal(s.unreadFor('chirper'), 1);
});

test('the same ping twice in a row is dropped', async () => {
  const p = post('chirper');
  await deliver(mentionDraft(p, ME));
  const again = await deliver(mentionDraft(p, ME));
  assert.equal(again, null);
  assert.equal(useNotificationStore.getState().items.length, 1);
});

test('the app on screen stays quiet: recorded, no banner', async () => {
  useNotificationStore.getState().setOpenApp('flashpic');
  await deliver(mentionDraft(post('flashpic'), ME));
  const s = useNotificationStore.getState();
  assert.equal(s.items.length, 1);
  assert.equal(s.banner, null);
  s.setOpenApp(null);
});

test('notification links parse, and a cold-start tap waits for the save to load', () => {
  assert.deepEqual(parseNotificationLink('vibeandvolumes://notification?id=nt-1-1001'), { id: 'nt-1-1001' });
  assert.deepEqual(parseNotificationLink('vibeandvolumes://notification?app=flashpic'), { app: 'flashpic' });
  assert.equal(parseNotificationLink('vibeandvolumes://somewhere-else'), null);
  assert.equal(handleNotificationLink('vibeandvolumes://notification?id=nt-1-1001', true), true);
  assert.equal(useNotificationStore.getState().pendingOpen, 'id:nt-1-1001');
  assert.equal(handleNotificationLink('vibeandvolumes://elsewhere', false), false);
});

// --- The game loop -------------------------------------------------------------

test('a new week queues pings for the posts worth it', () => {
  start();
  runWeekTransition([], []);
  assert.ok(pendingCount() > 0, 'pings are queued');
  assert.ok(pendingCount() <= 3, 'but only a few');
  clearSchedule();
});

test('a tapped notification still finds its post after the feed moves on', async () => {
  start();
  const p = post('chirper', { id: 'gone-1' });
  await deliver(mentionDraft(p, ME));
  useSocialStore.getState().setFeed([]);
  assert.equal(findPost('gone-1')?.id, 'gone-1');
});

test('comment threads are the same every visit, and the artist’s own posts get fans', () => {
  start();
  const player = usePlayerStore.getState().player!;
  const p = post('chirper', { id: 'stable-1', sentiment: 'hostile' });
  assert.deepEqual(generateThread(p, player), generateThread(p, player));
  const mine = post('flashpic', { id: 'me-flashpic-x', account: account({ id: 'player', username: 'Nova Kay', handle: 'novakay' }) });
  const thread = generateThread(mine, player);
  assert.ok(thread.length >= 6);
  assert.ok(thread.filter((r) => r.side === 'fan' || r.side === 'stan').length >= thread.length / 2);
  assert.ok(thread.every((r) => r.accountId.length > 0));
});

test('the artist’s own posts pick up likes over the next minutes', () => {
  const me = account({ id: 'player', username: 'Nova Kay', handle: 'novakay' });
  const p = createAuthored('chirper', me, 'new music friday', 3, undefined, 1_000_000);
  assert.equal(p.id, 'my-chirper-1000000');
  const early = withEngagement(p, 50_000, 1_000_000 + 30_000);
  const later = withEngagement(p, 50_000, 1_000_000 + 30 * 60_000);
  assert.ok(later.likes > early.likes);
  assert.ok(later.views! > later.likes);
});

test('summary lines read naturally per app', () => {
  const base = { id: 'x', nid: 1, at: 0, read: false, target: { kind: 'tab' as const, tab: 'inbox' } };
  assert.equal(summaryLine({ ...base, app: 'flashpic', kind: 'like', title: 'novakay', body: 'bripdaily liked your post.' }), 'bripdaily liked your post.');
  assert.equal(summaryLine({ ...base, app: 'tunetok', kind: 'like', title: 'Bri P', body: 'liked your video.' }), 'Bri P liked your video.');
});
