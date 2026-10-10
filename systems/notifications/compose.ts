import type { NpcAccount, Platform, SocialPost } from '../../types/social';
import type { NotificationActor, NotificationDraft, PhoneApp, PhoneNotification } from '../../types/notifications';
import type { ThreadReply } from '../social/threadGenerator';
import type { DmThread } from '../../types/drama';
import { planPostMedia, newsPhoto } from '../visuals/scenes';
import { planClip } from '../visuals/clips';

/**
 * NOTIFICATION COPY.
 *
 * Each app words its pings the way the real one does: Chirp leads with the
 * person, VibeGram puts your handle on top and "username liked your post."
 * underneath, TokTalk says "commented:" after the name, VibeNews pushes the
 * headline. Pure: drafts only, delivery happens elsewhere.
 */

export interface Me {
  /** The artist's handle on that app. */
  handle: string;
  name: string;
  /** Latest release title, for clips that use the artist's song. */
  trackTitle: string | null;
}

/** Per-app presentation of a notification: channel, status-bar icon, color. */
export const NOTIFY_APPS: Record<
  PhoneApp,
  { channel: string; channelName: string; description: string; icon: 'chirp' | 'vibegram' | 'toktalk' | 'pulsenews' | 'career'; color: string; name: string }
> = {
  chirper: { channel: 'chirp', channelName: 'Chirp', description: 'Mentions, replies, likes and new followers', icon: 'chirp', color: '#1D9BF0', name: 'Chirp' },
  flashpic: { channel: 'vibegram', channelName: 'VibeGram', description: 'Likes, comments, follows and stories', icon: 'vibegram', color: '#E1306C', name: 'VibeGram' },
  tunetok: { channel: 'toktalk', channelName: 'TokTalk', description: 'Likes, comments, follows and your sounds', icon: 'toktalk', color: '#FE2C55', name: 'TokTalk' },
  vibestream: { channel: 'pulsenews', channelName: 'VibeNews', description: 'Breaking music news', icon: 'pulsenews', color: '#E3294A', name: 'VibeNews' },
  game: { channel: 'career', channelName: 'Career', description: 'Level-ups, badges and energy', icon: 'career', color: '#8B6CFF', name: 'Vibe & Volumes' },
};

export function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function snippet(text: string, n = 64): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

export function actorOf(a: NpcAccount): NotificationActor {
  return { id: a.id, name: a.username, handle: a.handle, verified: a.isVerified };
}

export function actorOfReply(r: ThreadReply): NotificationActor {
  return { id: r.accountId, name: r.username, handle: r.handle, verified: r.verified };
}

/** The picture a notification about `post` carries (what you'd see expanded). */
export function imageFor(post: SocialPost, me: Me): PhoneNotification['image'] {
  if (post.platform === 'vibestream') return { photoKey: newsPhoto(post).key };
  if (post.platform === 'tunetok') {
    const shot = planClip(post, { playerName: me.name, trackTitle: me.trackTitle }).shots[0];
    return shot ? { photoKey: shot.photo.key } : undefined;
  }
  const plan = planPostMedia(post, { textCards: post.platform === 'flashpic', orientation: 'portrait' });
  if (!plan) return undefined;
  switch (plan.kind) {
    case 'photo':
      return { photoKey: plan.photos[0].key };
    case 'cover':
      return { trackId: plan.trackId };
    case 'split':
      return { photoKey: plan.left.key };
    case 'tweet':
      return undefined;
    default:
      return { photoKey: plan.photo.key };
  }
}

/** Someone posted about the artist. */
export function mentionDraft(post: SocialPost, me: Me): NotificationDraft {
  const a = post.account;
  const base = { app: post.platform, actor: actorOf(a), target: { kind: 'post' as const, postId: post.id }, post, image: imageFor(post, me) };
  switch (post.platform) {
    case 'chirper':
      return { ...base, kind: 'mention', title: a.username, body: post.content };
    case 'flashpic':
      return post.media
        ? { ...base, kind: 'post', title: me.handle, body: `${a.handle} shared a post about you.` }
        : { ...base, kind: 'mention', title: me.handle, body: `${a.handle} mentioned you: ${snippet(post.content)}` };
    case 'tunetok':
      return { ...base, kind: 'mention', title: a.username, body: `mentioned you in a video: ${snippet(post.content)}` };
    case 'vibestream':
      return { ...base, kind: 'news', title: post.content, body: `${a.username} · Top story` };
  }
}

/** Likes on one of the artist's own posts (`others` turns it into an aggregate). */
export function likeDraft(app: Platform, mine: SocialPost, actor: NotificationActor, me: Me, others = 0): NotificationDraft {
  const base = { app, kind: 'like' as const, actor, target: { kind: 'post' as const, postId: mine.id }, post: mine, image: imageFor(mine, me) };
  const many = others > 0 ? ` and ${short(others)} others` : '';
  switch (app) {
    case 'flashpic':
      return { ...base, title: me.handle, body: `${actor.handle}${many} liked your post.` };
    case 'tunetok':
      return { ...base, title: `${actor.name}${many}`, body: 'liked your video.' };
    default:
      return { ...base, title: `${actor.name}${many}`, body: `liked your post: ${snippet(mine.content)}` };
  }
}

/** A comment under one of the artist's posts; the tap opens on that comment. */
export function commentDraft(app: Platform, mine: SocialPost, reply: ThreadReply, me: Me): NotificationDraft {
  const actor = actorOfReply(reply);
  const image = imageFor(mine, me);
  switch (app) {
    case 'flashpic':
      return {
        app,
        kind: 'comment',
        actor,
        title: me.handle,
        body: `${reply.handle} commented: ${reply.content}`,
        target: { kind: 'post', postId: mine.id, replyId: reply.id },
        post: mine,
        image,
      };
    case 'tunetok':
      return {
        app,
        kind: 'comment',
        actor,
        title: reply.username,
        body: `commented: ${reply.content}`,
        target: { kind: 'comments', postId: mine.id, replyId: reply.id },
        post: mine,
        image,
      };
    default:
      return {
        app,
        kind: 'reply',
        actor,
        title: reply.username,
        body: reply.content,
        target: { kind: 'post', postId: mine.id, replyId: reply.id },
        post: mine,
      };
  }
}

/** Someone answered the artist's comment (or replied under a post where the artist commented). */
export function answerDraft(app: Platform, post: SocialPost, answer: ThreadReply, me: Me, hostId: string): NotificationDraft {
  const actor = actorOfReply(answer);
  const own = post.account.id === 'player';
  switch (app) {
    case 'flashpic':
      return {
        app,
        kind: 'comment',
        actor,
        title: me.handle,
        body: `${answer.handle} replied to your comment: ${answer.content}`,
        target: { kind: 'post', postId: post.id, replyId: hostId },
        post,
        image: own ? imageFor(post, me) : undefined,
      };
    case 'tunetok':
      return {
        app,
        kind: 'comment',
        actor,
        title: answer.username,
        body: `replied to your comment: ${answer.content}`,
        target: { kind: 'comments', postId: post.id, replyId: hostId },
        post,
      };
    default:
      return {
        app,
        kind: 'reply',
        actor,
        title: answer.username,
        body: answer.content,
        target: { kind: 'post', postId: post.id, replyId: hostId },
        post,
      };
  }
}

export function followDraft(app: Platform, actor: NotificationActor, me: Me): NotificationDraft {
  const target = { kind: 'account' as const, accountId: actor.id };
  switch (app) {
    case 'flashpic':
      return { app, kind: 'follow', actor, target, title: me.handle, body: `${actor.handle} started following you.` };
    case 'tunetok':
      return { app, kind: 'follow', actor, target, title: actor.name, body: 'started following you.' };
    default:
      return { app, kind: 'follow', actor, target, title: actor.name, body: 'followed you' };
  }
}

/** Someone slid into the DMs: worded the way each app words it. */
export function dmDraft(thread: DmThread, me: Me): NotificationDraft | null {
  const last = [...thread.messages].reverse().find((m) => m.from === 'them');
  if (!last) return null;
  const actor: NotificationActor = { id: thread.person.id, name: thread.person.name, handle: thread.person.handle, verified: thread.person.verified };
  const app = thread.platform === 'vibestream' ? 'flashpic' : thread.platform;
  const target = { kind: 'dm' as const, threadId: thread.id };
  const text = snippet(last.text, 90);
  switch (app) {
    case 'flashpic':
      return thread.request
        ? { app, kind: 'dm', actor, target, title: me.handle, body: `${actor.handle} wants to send you a message.` }
        : { app, kind: 'dm', actor, target, title: actor.handle, body: text };
    case 'tunetok':
      return { app, kind: 'dm', actor, target, title: actor.name, body: `sent you a message: ${text}` };
    default:
      return { app, kind: 'dm', actor, target, title: actor.name, body: text };
  }
}

/** Someone replied to the artist's story: VibeGram words it "replied to your story". */
export function storyReplyDraft(thread: DmThread, me: Me): NotificationDraft | null {
  const last = [...thread.messages].reverse().find((m) => m.from === 'them');
  if (!last) return null;
  const actor: NotificationActor = { id: thread.person.id, name: thread.person.name, handle: thread.person.handle, verified: thread.person.verified };
  return { app: 'flashpic', kind: 'dm', actor, title: me.handle, body: `${actor.handle} replied to your story: ${snippet(last.text, 90)}`, target: { kind: 'dm', threadId: thread.id } };
}

export function repostDraft(mine: SocialPost, actor: NotificationActor): NotificationDraft {
  return {
    app: 'chirper',
    kind: 'repost',
    actor,
    title: actor.name,
    body: `reposted your post: ${snippet(mine.content)}`,
    target: { kind: 'post', postId: mine.id },
    post: mine,
  };
}

/** Someone tagged the artist in their story. The story rides along. */
export function storyDraft(story: SocialPost, me: Me): NotificationDraft {
  return {
    app: 'flashpic',
    kind: 'story',
    actor: actorOf(story.account),
    title: me.handle,
    body: `${story.account.handle} mentioned you in their story.`,
    target: { kind: 'story', accountId: story.account.id },
    post: story,
    image: imageFor(story, me),
  };
}

/** The artist's song is being used in other people's videos. */
export function soundDraft(mine: SocialPost, trackTitle: string, videos: number, me: Me): NotificationDraft {
  return {
    app: 'tunetok',
    kind: 'sound',
    title: 'Your sound is trending 🔥',
    body: `${short(videos)} videos are using "${trackTitle}" right now.`,
    target: { kind: 'post', postId: mine.id },
    post: mine,
    image: imageFor(mine, me),
  };
}

export function viewsDraft(mine: SocialPost, me: Me): NotificationDraft {
  return {
    app: 'tunetok',
    kind: 'views',
    title: 'Your video is taking off 🚀',
    body: `${short(mine.views ?? 0)} views and climbing.`,
    target: { kind: 'post', postId: mine.id },
    post: mine,
    image: imageFor(mine, me),
  };
}

/** One of the game's own moments: a level, a badge, a full tank. */
export function gameDraft(kind: 'level' | 'achievement' | 'energy' | 'info', title: string, body: string, color: string, href: string): NotificationDraft {
  return { app: 'game', kind, title, body, color, target: { kind: 'route', href } };
}

/** One line of an app's grouped summary ("username liked your post."). */
export function summaryLine(n: PhoneNotification): string {
  if (n.app === 'flashpic' || n.app === 'vibestream' || n.app === 'game') return snippet(n.app === 'vibestream' ? n.title : n.body, 80);
  return snippet(`${n.title} ${n.body}`, 80);
}
