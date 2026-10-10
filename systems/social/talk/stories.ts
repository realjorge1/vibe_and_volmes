import type { SocialPost } from '../../../types/social';
import type { Player } from '../../../types/player';
import type { DmPerson, DmThread } from '../../../types/drama';
import { crowdPerson, seeded } from '../../drama/crowd';
import { fameReach } from '../../../utils/statHelpers';
import { hasNegative, isApproved, isProtected } from '../protect';
import { postTopic } from './topic';
import { typed, TYPISTS } from './voice';
import { REAL_ANY, REAL_BY_KIND, REAL_EMOJI, REAL_EMOJI_BY_KIND, REAL_REPLY_BACK } from '../../../data/social/realPhotoComments';
import { OPEN_BY_KIND } from '../../../data/social/talk/kinds';
import { PEER_REPLY, REPLY_BACK } from '../../../data/social/talk/replies';

/**
 * REPLIES TO THE ARTIST'S STORIES (pure).
 *
 * On VibeGram, a story doesn't get comments: people reply in your DMs
 * ("replied to your story"). They react to what the story shows (the photo
 * was read when it went up), more of them the more famous the artist is,
 * and when the artist answers, they answer back. Under a real photo only the
 * vetted kind lines are used, checked like every comment there.
 */

/** DM threads that are story replies (the weekly DM engine leaves them alone: no quick replies). */
export const STORY_ARC = 'story-reply';

export interface StoryReply {
  person: DmPerson;
  text: string;
  /** How long after the story went up (ms). */
  after: number;
}

const DEFAULT_THING: Record<string, string> = { pet: 'baby', food: 'food', ride: 'ride', home: 'place', drip: 'piece', scenery: 'view', art: 'piece', tech: 'setup', music: 'setup' };

/** Who replies to a story, what they say and when. Seeded by the story: always the same people. */
export function storyReplies(story: SocialPost, player: Player): StoryReply[] {
  const r = seeded(`story-replies:${story.id}`);
  const reach = fameReach(player.stats.fans);
  const n = reach < 0.25 ? (r() < 0.5 ? 1 : 0) : reach < 0.5 ? 1 + Math.floor(r() * 2) : 2 + Math.floor(r() * 3);
  const safe = isProtected(story);
  const topic = postTopic(story);
  const k = topic.known && topic.kind ? topic.kind : 'other';
  const real = REAL_BY_KIND[k];
  const thing = topic.thing ?? DEFAULT_THING[k] ?? 'this';
  const lines = [
    ...real.lines,
    ...(topic.thing ? (real.things?.[topic.thing] ?? []) : []),
    ...(real.asks ?? []),
    ...(REAL_EMOJI_BY_KIND[k] ?? REAL_EMOJI),
    ...(topic.known ? [] : REAL_ANY),
    ...(safe || !topic.known ? [] : OPEN_BY_KIND[k].hype),
  ];
  const out: StoryReply[] = [];
  const used = new Set<string>();
  for (let i = 0, guard = 0; out.length < n && guard < n * 8; i++, guard++) {
    const raw = lines[Math.floor(r() * lines.length)];
    if (!raw || used.has(raw)) continue;
    const text = typed(raw.replace(/\{thing\}/g, thing).replace(/\{name\}/g, player.artistName), r, TYPISTS.stan);
    // Under a real photo a reply has to be a vetted, kind line.
    if (safe && (!isApproved(text) || hasNegative(text))) continue;
    used.add(raw);
    const p = crowdPerson(`story:${story.id}:${i}`, { vibe: 'fan', platform: 'flashpic' });
    out.push({
      person: { id: p.id, name: p.username, handle: p.handle, gender: p.gender, followers: p.followers, verified: false },
      text,
      after: 25_000 + Math.round(r() * (out.length + 1) * 150_000),
    });
  }
  return out.sort((a, b) => a.after - b.after);
}

/** A story reply as a DM conversation (it shows up in VibeGram's messages). */
export function storyThread(story: SocialPost, reply: StoryReply, k: number, at: number, week: number): DmThread {
  return {
    id: `story-${story.id}-${k}`,
    platform: 'flashpic',
    arc: STORY_ARC,
    kind: 'superfan',
    person: reply.person,
    stage: 'reply',
    messages: [{ from: 'them', text: reply.text, at }],
    options: [],
    unread: true,
    request: false,
    state: 'open',
    startedWeek: week,
    lastWeek: week,
    ignoredWeeks: 0,
    vars: { story: story.id, real: isProtected(story) ? '1' : '0' },
  };
}

/** The artist answers a story reply: it stays in the thread, and they answer back a few seconds later. */
export function answerStory(thread: DmThread, text: string, player: Player, now: number): DmThread {
  const r = seeded(`story-answer:${thread.id}:${thread.messages.length}`);
  const mine = { from: 'me' as const, text: text.trim(), at: now };
  // They answer the first time the artist writes back (a fan doesn't keep a chat going forever).
  const answered = thread.messages.some((m) => m.from === 'me');
  if (answered || !text.trim()) return { ...thread, messages: [...thread.messages, mine], unread: false };
  const safe = thread.vars.real === '1';
  const pool = safe ? REAL_REPLY_BACK : [...REPLY_BACK, ...REAL_REPLY_BACK, ...(fameReach(player.stats.fans) < 0.3 ? PEER_REPLY : [])];
  let line = typed(pool[Math.floor(r() * pool.length)].replace(/\{name\}/g, player.artistName), r, TYPISTS.stan);
  if (safe && (!isApproved(line) || hasNegative(line))) line = '❤️❤️';
  return {
    ...thread,
    messages: [...thread.messages, mine, { from: 'them', text: line, at: now + 6_000 + Math.round(r() * 30_000) }],
    unread: false,
    lastWeek: thread.lastWeek,
  };
}
