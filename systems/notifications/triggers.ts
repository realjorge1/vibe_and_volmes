import { AppState } from 'react-native';
import type { MyComment, NpcAccount, Platform, SocialPost } from '../../types/social';
import type { NotificationActor, NotificationDraft } from '../../types/notifications';
import type { DmThread } from '../../types/drama';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useSocialStore } from '../../store/socialStore';
import { useNotificationStore } from '../../store/notificationStore';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { playerAccount, playerHandle } from '../social/playerAccount';
import { generateThread, strangerFor, type ThreadReply } from '../social/threadGenerator';
import { threadContext } from '../social/threadContext';
import { streamMorePosts } from '../social/feedStream';
import { withEngagement } from '../social/authored';
import { visibleCommentCount } from '../social/talk/myThread';
import { answersFor } from '../social/talk/live';
import { hostId } from '../social/talk/conversation';
import { realTopicsNow } from '../realworld/refresh';
import { realPost } from '../realworld/posts';
import { storyReplies, storyThread } from '../social/talk/stories';
import { useDramaStore } from '../../store/dramaStore';
import { feedHighlights } from './select';
import {
  actorOf,
  actorOfReply,
  answerDraft,
  storyReplyDraft,
  commentDraft,
  dmDraft,
  followDraft,
  gameDraft,
  likeDraft,
  mentionDraft,
  repostDraft,
  soundDraft,
  storyDraft,
  viewsDraft,
  type Me,
} from './compose';
import { pendingCount, schedule } from './schedule';

/**
 * WHEN THE PHONE BUZZES.
 *
 * The moments that make the artist's apps ping: a new week's chatter (only
 * the posts worth a push), a story about something they just did, what
 * happened while they were away, a release (likes and comments trickle in
 * over the next minute), the game's own milestones, and, while they play,
 * the steady drip of a real account: a follow here, a like there.
 */

const SOCIAL: readonly Platform[] = ['chirper', 'flashpic', 'tunetok'];

function live(): boolean {
  return !!usePlayerStore.getState().player && useGameStore.getState().ending === null;
}

function meOn(): Me | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  return {
    handle: playerHandle(player),
    name: player.artistName,
    trackTitle: useMusicStore.getState().getLatestTrack()?.title ?? null,
  };
}

/** The artist's own posts on an app, newest first. */
function myPosts(platform: Platform): SocialPost[] {
  const player = usePlayerStore.getState().player;
  if (!player) return [];
  return playerAccount(player, platform, useMusicStore.getState().discography).posts;
}

function rand(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function aboutPost(post: SocialPost): () => NotificationDraft | null {
  return () => {
    const me = meOn();
    return me && live() ? mentionDraft(post, me) : null;
  };
}

/** A new week's feed landed: push the few posts a real app would. */
export function notifyNewWeek(): void {
  if (!live()) return;
  feedHighlights(useSocialStore.getState().feed, 3).forEach((p, i) => schedule(2500 + i * 8000, aboutPost(p)));
}

/** One specific post about the artist (a story beat, a luxury reaction). */
export function notifyPost(post: SocialPost | null, delayMs = 2500): void {
  if (!post || !live()) return;
  schedule(delayMs, aboutPost(post));
}

/** A DM landed (or someone followed up). */
export function notifyDm(thread: DmThread, delayMs = 4000): void {
  if (!live() || thread.state === 'blocked') return;
  schedule(delayMs, () => {
    const me = meOn();
    return me && live() ? dmDraft(thread, me) : null;
  });
}

/** What the world said while the player was away. */
export function notifyAway(posts: readonly SocialPost[]): void {
  if (posts.length === 0 || !live()) return;
  feedHighlights(posts, 2).forEach((p, i) => schedule(3000 + i * 9000, aboutPost(p)));
}

/** Fans in a post's comments, first come first served, never twice for the same thing. */
function freshReply(post: SocialPost, kind: 'like' | 'comment'): ThreadReply | null {
  const player = usePlayerStore.getState().player;
  if (!player) return null;
  // A comment ping quotes one that has arrived; anyone in the section may have liked it already.
  const thread = generateThread(post, player, threadContext(), kind === 'comment' ? Date.now() : Infinity).filter(
    (r) => r.side === 'fan' || r.side === 'stan'
  );
  const about = useNotificationStore.getState().items.filter((n) => n.post?.id === post.id);
  if (kind === 'comment') {
    const quoted = new Set(about.map((n) => ('replyId' in n.target ? n.target.replyId : undefined)));
    return thread.find((r) => !quoted.has(r.id)) ?? null;
  }
  const liked = new Set(about.filter((n) => n.kind === 'like' || n.kind === 'repost').map((n) => n.actor?.id));
  return thread.find((r) => !liked.has(r.accountId)) ?? null;
}

/**
 * A release went out: for the next minute and a half the phone lights up the
 * way it does for a real drop.
 */
export function notifyRelease(trackId: string): void {
  if (!live()) return;
  const mine = (app: Platform) => myPosts(app).find((p) => p.id === `me-${app}-${trackId}`) ?? null;
  const step = (delay: number, make: (me: Me) => NotificationDraft | null) =>
    schedule(delay, () => {
      const me = meOn();
      return me && live() ? make(me) : null;
    });

  step(5000, (me) => {
    const p = mine('flashpic');
    const r = p && freshReply(p, 'like');
    return p && r ? likeDraft('flashpic', p, actorOfReply(r), me) : null;
  });
  step(13000, (me) => {
    const p = mine('tunetok');
    const r = p && freshReply(p, 'comment');
    return p && r ? commentDraft('tunetok', p, r, me) : null;
  });
  step(22000, () => {
    const p = mine('chirper');
    const r = p && freshReply(p, 'like');
    return p && r ? repostDraft(p, actorOfReply(r)) : null;
  });
  step(36000, (me) => {
    const p = mine('flashpic');
    const r = p && freshReply(p, 'comment');
    return p && r ? commentDraft('flashpic', p, r, me) : null;
  });
  step(55000, (me) => {
    const p = mine('flashpic');
    const r = p && freshReply(p, 'like');
    return p && r ? likeDraft('flashpic', p, actorOfReply(r), me, Math.max(0, p.likes - 1)) : null;
  });
  step(80000, (me) => {
    const p = mine('tunetok');
    if (!p) return null;
    const track = useMusicStore.getState().discography.find((t) => t.id === trackId);
    if (track?.wentViral) return soundDraft(p, track.title, Math.round((p.shares ?? 0) * 3 + 140), me);
    return (p.views ?? 0) > 4000 ? viewsDraft(p, me) : followDraft('tunetok', randomFollower('tunetok'), me);
  });
}

/**
 * The artist posted something from one of the apps: over the next couple of
 * minutes the likes and replies come in, and the phone says so.
 */
export function notifyMyPost(postId: string): void {
  if (!live()) return;
  const current = (): SocialPost | null => {
    const player = usePlayerStore.getState().player;
    const p = useSocialStore.getState().authored.find((x) => x.id === postId);
    if (!player || !p) return null;
    const acct = playerAccount(player, p.platform, useMusicStore.getState().discography).account;
    return withEngagement({ ...p, account: acct }, acct.followers, Date.now(), (t) => visibleCommentCount(p.id, player.stats.fans, t));
  };
  const step = (delay: number, make: (p: SocialPost, me: Me) => NotificationDraft | null) =>
    schedule(delay, () => {
      const p = current();
      const me = meOn();
      return p && me && live() ? make(p, me) : null;
    });
  step(7000, (p, me) => {
    const r = freshReply(p, 'like');
    return r ? likeDraft(p.platform, p, actorOfReply(r), me) : null;
  });
  step(19000, (p, me) => {
    const r = freshReply(p, 'comment');
    return r ? commentDraft(p.platform, p, r, me) : null;
  });
  step(42000, (p, me) => {
    const r = freshReply(p, 'like');
    return r ? likeDraft(p.platform, p, actorOfReply(r), me, Math.max(0, p.likes - 1)) : null;
  });
  step(75000, (p, me) => {
    const r = freshReply(p, p.platform === 'chirper' ? 'like' : 'comment');
    if (!r) return null;
    return p.platform === 'chirper' ? repostDraft(p, actorOfReply(r)) : commentDraft(p.platform, p, r, me);
  });
}

/**
 * The artist commented somewhere: the first people to answer ping the phone
 * when they do (the post's author and the person they replied to first).
 */
export function notifyAnswers(c: MyComment, post: SocialPost): void {
  if (!live() || post.platform === 'vibestream') return;
  const now = Date.now();
  const all = answersFor(c, post).filter((a) => (a.at ?? now) > now - 1000);
  const first = [...all.filter((a) => a.accountId === post.account.id || (c.toAccountId && a.accountId === c.toAccountId)), ...all].filter(
    (a, i, arr) => arr.findIndex((b) => b.id === a.id) === i
  );
  const host = hostId(c.parentId, c.id, useSocialStore.getState().myComments);
  for (const a of first.slice(0, 2)) {
    schedule(Math.max(0, (a.at ?? now) - now), () => {
      const me = meOn();
      return me && live() ? answerDraft(post.platform, post, a, me, c.parentId ? host : c.id) : null;
    });
  }
}

/**
 * The artist posted a story: over the next minutes a few people reply in
 * the DMs (more for a star), each landing as its own conversation.
 */
export function notifyStoryReplies(story: SocialPost): void {
  if (!live()) return;
  const player = usePlayerStore.getState().player;
  if (!player) return;
  storyReplies(story, player).forEach((reply, k) => {
    schedule(reply.after, () => {
      const me = meOn();
      if (!me || !live()) return null;
      const thread = storyThread(story, reply, k, Date.now(), useGameStore.getState().week);
      if (useDramaStore.getState().getDm(thread.id)) return null;
      useDramaStore.getState().upsertDm(thread);
      useDramaStore.getState().save();
      return storyReplyDraft(thread, me);
    });
  });
}

/** Level-ups, badges, a full tank: the game's own notifications. */
export function notifyGame(kind: 'level' | 'achievement' | 'energy' | 'info', title: string, body: string, color: string): void {
  if (!usePlayerStore.getState().player) return;
  const href = kind === 'level' || kind === 'achievement' ? '/(game)/empire' : '/(game)';
  schedule(300, () => gameDraft(kind, title, body, color, href));
}

// --- The drip while you play -------------------------------------------------

function randomFollower(app: Platform): NotificationActor {
  const pool = NPC_ACCOUNTS.filter(
    (a) => a.preferredPlatforms.includes(app) && (a.accountType === 'fan' || a.accountType === 'public' || a.accountType === 'stan')
  );
  const followed = new Set(
    useNotificationStore
      .getState()
      .items.filter((n) => n.kind === 'follow' && n.app === app)
      .map((n) => n.actor?.id)
  );
  const npc = pool.filter((a) => !followed.has(a.id));
  if (npc.length > 0 && Math.random() < 0.4) return actorOf(npc[rand(0, npc.length - 1)]);
  const s = strangerFor(`${app}:${Date.now()}:${Math.random()}`);
  return { id: s.accountId, name: s.username, handle: s.handle, verified: false };
}

const STORY_LINES: readonly (readonly [string, string])[] = [
  ['{track} on repeat all day 🎧', '📸 vinyl spinning on the desk'],
  ['seeing @{handle} live was insane 😭', '📸 crowd at the show, lights everywhere'],
  ['this @{handle} song hits different at 2am', '📸 rain on the window at night'],
  ['@{handle} come to {city} pls 🙏', '📸 rooftop view over the city'],
  ['new @{handle} era loading… 👀', '📸 studio, mic set up, notebook open'],
  ['road trip soundtrack: all @{handle} 🚗', '📸 sunset drive, windows down'],
];

/** Someone put the artist in their story. */
function storyMention(): NotificationDraft | null {
  const player = usePlayerStore.getState().player;
  const me = meOn();
  if (!player || !me) return null;
  const pool: NpcAccount[] = NPC_ACCOUNTS.filter(
    (a) => a.preferredPlatforms.includes('flashpic') && a.accountType !== 'news' && a.accountType !== 'industry'
  );
  const account = pool[rand(0, pool.length - 1)];
  if (!account) return null;
  const [line, description] = STORY_LINES[rand(0, STORY_LINES.length - 1)];
  const content = line
    .replace(/\{handle\}/g, me.handle)
    .replace(/\{track\}/g, me.trackTitle ?? player.artistName)
    .replace(/\{city\}/g, player.city);
  const story: SocialPost = {
    id: `story-${account.id}-${Date.now()}`,
    platform: 'flashpic',
    account,
    content,
    sentiment: 'hype',
    likes: rand(20, 900),
    reposts: 0,
    replies: 0,
    week: useGameStore.getState().week,
    media: { kind: 'image', description },
  };
  return storyDraft(story, me);
}

/** A brand-new post about the artist goes up (and really is in the feed). */
function freshMention(app: Platform): NotificationDraft | null {
  const player = usePlayerStore.getState().player;
  const me = meOn();
  if (!player || !me) return null;
  const posts = streamMorePosts({
    player,
    week: useGameStore.getState().week,
    platform: app,
    track: useMusicStore.getState().getLatestTrack(),
    count: 4,
    page: Date.now() % 100_000,
  });
  const best = feedHighlights(posts, 1)[0] ?? posts[0];
  if (!best) return null;
  const social = useSocialStore.getState();
  social.setFeed([best, ...social.feed].slice(0, 80));
  social.addToHistory([best]);
  return mentionDraft(best, me);
}

function ambientDraft(): NotificationDraft | null {
  const me = meOn();
  if (!me || !live()) return null;
  const options: [number, () => NotificationDraft | null][] = [];
  for (const app of SOCIAL) {
    options.push([2, () => followDraft(app, randomFollower(app), me)]);
    const latest = myPosts(app)[0];
    if (latest) {
      options.push([3, () => {
        const r = freshReply(latest, 'like');
        return r ? likeDraft(app, latest, actorOfReply(r), me) : null;
      }]);
      options.push([2, () => {
        const r = freshReply(latest, 'comment');
        return r ? commentDraft(app, latest, r, me) : null;
      }]);
    }
  }
  const tweet = myPosts('chirper')[0];
  if (tweet) {
    options.push([1, () => {
      const r = freshReply(tweet, 'like');
      return r ? repostDraft(tweet, actorOfReply(r)) : null;
    }]);
  }
  options.push([2, storyMention]);
  options.push([1, realNewsPing]);
  options.push([2, () => freshMention('chirper')]);
  options.push([1, () => freshMention('flashpic')]);
  options.push([1, () => freshMention('tunetok')]);

  for (let attempt = 0; attempt < 3; attempt++) {
    const total = options.reduce((s, [w]) => s + w, 0);
    let roll = Math.random() * total;
    const hit = options.find(([w]) => (roll -= w) <= 0) ?? options[options.length - 1];
    const draft = hit[1]();
    if (draft) return draft;
  }
  return null;
}

const pingedStories = new Set<string>();
let lastNewsPingAt = 0;

/**
 * VibeNews pushing a real top story now and then (like Google News does):
 * at most one every hour and a half, each story once.
 */
function realNewsPing(): NotificationDraft | null {
  const me = meOn();
  const now = Date.now();
  if (!me || now - lastNewsPingAt < 90 * 60_000) return null;
  const topic = realTopicsNow(now).find((t) => !t.evergreen && t.headline.url && !pingedStories.has(t.id));
  if (!topic) return null;
  pingedStories.add(topic.id);
  lastNewsPingAt = now;
  const post = realPost(topic, 'vibestream', 0, { week: useGameStore.getState().week, idPrefix: `ping-${topic.id}`, city: usePlayerStore.getState().player?.city ?? '' });
  return mentionDraft(post, me);
}

let nextAmbientAt = 0;

/** Called on the live poll: every few minutes of play, something small happens. */
export function ambientTick(now = Date.now()): void {
  if (!live() || AppState.currentState !== 'active') return;
  if (nextAmbientAt === 0) {
    nextAmbientAt = now + rand(100_000, 200_000);
    return;
  }
  if (now < nextAmbientAt) return;
  nextAmbientAt = now + rand(240_000, 480_000);
  if (pendingCount() > 2) return;
  schedule(0, ambientDraft);
}

/** A new session (or a new career) starts the drip from scratch. */
export function resetAmbient(): void {
  nextAmbientAt = 0;
}
